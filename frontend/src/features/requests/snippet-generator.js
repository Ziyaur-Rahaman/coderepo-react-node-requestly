/**
 * Code Snippet Generator for Postman-like API Requests
 * Supports cURL, JavaScript (Fetch), Python (Requests), Node.js (Axios), and Raw HTTP.
 * Strictly vanilla JS with zero third-party dependencies.
 */

import { resolveString, buildVariablesMap } from "../environments/variable-resolver.js";

/**
 * Normalizes request config with active environment variables and auth.
 * @param {Object} config - { method, url, queryParams, headers, bodyType, bodyContent, auth }
 * @param {Object} options - { resolveVariables: boolean, variablesMap: Object, maskSecrets: boolean }
 * @returns {Object} normalized request details
 */
export function normalizeRequest(config, options = {}) {
    const {
        method = "GET",
        url = "",
        queryParams = [],
        headers = [],
        bodyType = "none",
        bodyContent = "",
        auth = { type: "none", config: {} },
    } = config || {};

    const {
        resolveVariables = false,
        variablesMap = {},
        maskSecrets = false,
    } = options;

    const resolve = (val) => {
        if (!val || typeof val !== "string") return val ?? "";
        return resolveVariables ? resolveString(val, variablesMap) : val;
    };

    // 1. Process base URL
    let resolvedBaseUrl = resolve(url.trim());

    // 2. Process query parameters
    const activeParams = (queryParams || [])
        .filter((p) => p && p.enabled !== false && p.key)
        .map((p) => ({
            key: resolve(p.key.trim()),
            value: resolve(p.value ?? ""),
        }));

    // 3. Process headers
    const activeHeaders = (headers || [])
        .filter((h) => h && h.enabled !== false && h.key)
        .map((h) => ({
            key: resolve(h.key.trim()),
            value: resolve(h.value ?? ""),
        }));

    // 4. Process Authentication
    const authType = auth?.type || "none";
    const authConfig = auth?.config || {};

    if (authType === "bearer") {
        let token = resolve((authConfig.token || "").trim());
        if (maskSecrets && token) {
            token = "<BEARER_TOKEN>";
        }
        if (token) {
            // Replace or add Authorization header
            const existingIdx = activeHeaders.findIndex((h) => h.key.toLowerCase() === "authorization");
            if (existingIdx !== -1) {
                activeHeaders[existingIdx].value = `Bearer ${token}`;
            } else {
                activeHeaders.push({ key: "Authorization", value: `Bearer ${token}` });
            }
        }
    } else if (authType === "basic") {
        let username = resolve((authConfig.username || "").trim());
        let password = resolve(authConfig.password || "");
        if (maskSecrets) {
            password = "<PASSWORD>";
        }
        if (username || password) {
            let encoded;
            if (maskSecrets) {
                encoded = `<BASIC_AUTH_TOKEN>`;
            } else {
                try {
                    encoded = btoa(`${username}:${password}`);
                } catch {
                    encoded = Buffer ? Buffer.from(`${username}:${password}`).toString("base64") : `${username}:${password}`;
                }
            }
            const existingIdx = activeHeaders.findIndex((h) => h.key.toLowerCase() === "authorization");
            if (existingIdx !== -1) {
                activeHeaders[existingIdx].value = `Basic ${encoded}`;
            } else {
                activeHeaders.push({ key: "Authorization", value: `Basic ${encoded}` });
            }
        }
    } else if (authType === "apiKey") {
        const key = resolve((authConfig.key || "").trim());
        let value = resolve(authConfig.value ?? "");
        const addTo = authConfig.addTo === "queryParams" ? "queryParams" : "header";

        if (maskSecrets && value) {
            value = "<API_KEY>";
        }

        if (key) {
            if (addTo === "queryParams") {
                activeParams.push({ key, value });
            } else {
                const existingIdx = activeHeaders.findIndex((h) => h.key.toLowerCase() === key.toLowerCase());
                if (existingIdx !== -1) {
                    activeHeaders[existingIdx].value = value;
                } else {
                    activeHeaders.push({ key, value });
                }
            }
        }
    }

    // 5. Construct complete target URL
    let fullUrl = resolvedBaseUrl;
    if (activeParams.length > 0 && fullUrl) {
        const queryString = activeParams
            .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
            .join("&");
        const separator = fullUrl.includes("?") ? "&" : "?";
        fullUrl = `${fullUrl}${separator}${queryString}`;
    }

    // 6. Process Body
    let processedBody = "";
    const isPayloadAllowed = !["GET", "HEAD"].includes(method.toUpperCase());

    if (isPayloadAllowed && bodyType !== "none" && bodyContent) {
        processedBody = resolve(bodyContent);

        // Auto-add Content-Type if missing and applicable
        const hasContentType = activeHeaders.some((h) => h.key.toLowerCase() === "content-type");
        if (!hasContentType) {
            if (bodyType === "json") {
                activeHeaders.unshift({ key: "Content-Type", value: "application/json" });
            } else if (bodyType === "xml") {
                activeHeaders.unshift({ key: "Content-Type", value: "application/xml" });
            } else if (bodyType === "text") {
                activeHeaders.unshift({ key: "Content-Type", value: "text/plain" });
            } else if (bodyType === "form-urlencoded") {
                activeHeaders.unshift({ key: "Content-Type", value: "application/x-www-form-urlencoded" });
            }
        }
    }

    return {
        method: method.toUpperCase(),
        url: fullUrl || "http://localhost:8000/api/v1/health",
        rawUrl: resolvedBaseUrl,
        queryParams: activeParams,
        headers: activeHeaders,
        bodyType,
        bodyContent: processedBody,
    };
}

/**
 * Generator: cURL
 */
export function generateCurlSnippet(request) {
    const { method, url, headers, bodyContent } = request;
    const parts = ["curl --location"];

    if (method !== "GET") {
        parts.push(`--request ${method}`);
    }

    parts.push(`'${url.replace(/'/g, "'\\''")}'`);

    headers.forEach((h) => {
        parts.push(`--header '${h.key}: ${h.value.replace(/'/g, "'\\''")}'`);
    });

    if (bodyContent && !["GET", "HEAD"].includes(method)) {
        // Pretty formatting for json payload in cURL
        let escapedData = bodyContent.replace(/'/g, "'\\''");
        parts.push(`--data-raw '${escapedData}'`);
    }

    return parts.join(" \\\n  ");
}

/**
 * Generator: JavaScript (Fetch)
 */
export function generateFetchSnippet(request) {
    const { method, url, headers, bodyContent } = request;
    const lines = [];

    // Headers
    if (headers.length > 0) {
        lines.push("const myHeaders = new Headers();");
        headers.forEach((h) => {
            lines.push(`myHeaders.append(${JSON.stringify(h.key)}, ${JSON.stringify(h.value)});`);
        });
        lines.push("");
    }

    // Body
    let hasBody = Boolean(bodyContent && !["GET", "HEAD"].includes(method));
    if (hasBody) {
        // If JSON, try to format nicely
        let isJson = false;
        try {
            JSON.parse(bodyContent);
            isJson = true;
        } catch {}

        if (isJson) {
            lines.push(`const raw = JSON.stringify(${bodyContent.trim()});`);
        } else {
            lines.push(`const raw = ${JSON.stringify(bodyContent)};`);
        }
        lines.push("");
    }

    // Request Options
    lines.push("const requestOptions = {");
    lines.push(`  method: "${method}",`);
    if (headers.length > 0) {
        lines.push("  headers: myHeaders,");
    }
    if (hasBody) {
        lines.push("  body: raw,");
    }
    lines.push("  redirect: \"follow\"");
    lines.push("};");
    lines.push("");

    // Fetch call
    lines.push(`fetch("${url}", requestOptions)`);
    lines.push("  .then((response) => response.text())");
    lines.push("  .then((result) => console.log(result))");
    lines.push("  .catch((error) => console.error(error));");

    return lines.join("\n");
}

/**
 * Generator: Python (Requests)
 */
export function generatePythonSnippet(request) {
    const { method, url, headers, bodyContent } = request;
    const lines = ["import requests", ""];

    lines.push(`url = "${url}"`);
    lines.push("");

    // Payload
    const hasBody = Boolean(bodyContent && !["GET", "HEAD"].includes(method));
    if (hasBody) {
        let isJson = false;
        let parsed = null;
        try {
            parsed = JSON.parse(bodyContent);
            isJson = true;
        } catch {}

        if (isJson) {
            lines.push("import json");
            lines.push("");
            lines.push(`payload = json.dumps(${JSON.stringify(parsed, null, 4)})`);
        } else {
            lines.push(`payload = ${JSON.stringify(bodyContent)}`);
        }
    } else {
        lines.push("payload = {}");
    }

    // Headers dict
    if (headers.length > 0) {
        lines.push("headers = {");
        headers.forEach((h) => {
            lines.push(`  ${JSON.stringify(h.key)}: ${JSON.stringify(h.value)},`);
        });
        lines.push("}");
    } else {
        lines.push("headers = {}");
    }
    lines.push("");

    lines.push(`response = requests.request("${method}", url, headers=headers, data=payload)`);
    lines.push("");
    lines.push("print(response.status_code)");
    lines.push("print(response.text)");

    return lines.join("\n");
}

/**
 * Generator: Node.js (Axios)
 */
export function generateAxiosSnippet(request) {
    const { method, url, headers, bodyContent } = request;
    const lines = [
        "const axios = require('axios');",
        "",
    ];

    const hasBody = Boolean(bodyContent && !["GET", "HEAD"].includes(method));
    if (hasBody) {
        let isJson = false;
        try {
            JSON.parse(bodyContent);
            isJson = true;
        } catch {}

        if (isJson) {
            lines.push(`let data = JSON.stringify(${bodyContent.trim()});`);
        } else {
            lines.push(`let data = ${JSON.stringify(bodyContent)};`);
        }
    } else {
        lines.push("let data = '';");
    }
    lines.push("");

    lines.push("let config = {");
    lines.push(`  method: '${method.toLowerCase()}',`);
    lines.push(`  maxBodyLength: Infinity,`);
    lines.push(`  url: '${url}',`);

    if (headers.length > 0) {
        lines.push("  headers: {");
        headers.forEach((h) => {
            lines.push(`    '${h.key}': '${h.value.replace(/'/g, "\\'")}',`);
        });
        lines.push("  },");
    }

    if (hasBody) {
        lines.push("  data: data");
    }
    lines.push("};");
    lines.push("");

    lines.push("axios.request(config)");
    lines.push(".then((response) => {");
    lines.push("  console.log(JSON.stringify(response.data));");
    lines.push("})");
    lines.push(".catch((error) => {");
    lines.push("  console.log(error);");
    lines.push("});");

    return lines.join("\n");
}

/**
 * Generator: Raw HTTP Request
 */
export function generateRawHttpSnippet(request) {
    const { method, url, headers, bodyContent } = request;
    let path = "/";
    let host = "localhost";

    try {
        const parsed = new URL(url);
        path = parsed.pathname + parsed.search;
        host = parsed.host;
    } catch {
        path = url || "/";
    }

    const lines = [`${method} ${path} HTTP/1.1`];
    const hasHost = headers.some((h) => h.key.toLowerCase() === "host");
    if (!hasHost) {
        lines.push(`Host: ${host}`);
    }

    headers.forEach((h) => {
        lines.push(`${h.key}: ${h.value}`);
    });

    lines.push("");

    if (bodyContent && !["GET", "HEAD"].includes(method)) {
        lines.push(bodyContent);
    }

    return lines.join("\n");
}

export const SUPPORTED_LANGUAGES = [
    { id: "curl", name: "cURL", mode: "bash" },
    { id: "javascript-fetch", name: "JavaScript (Fetch)", mode: "javascript" },
    { id: "python-requests", name: "Python (Requests)", mode: "python" },
    { id: "nodejs-axios", name: "Node.js (Axios)", mode: "javascript" },
    { id: "raw-http", name: "HTTP (Raw)", mode: "http" },
];

/**
 * Main facade function to generate a code snippet for a given language.
 */
export function generateSnippet(langId, config, options = {}) {
    const normalized = normalizeRequest(config, options);

    switch (langId) {
        case "curl":
            return generateCurlSnippet(normalized);
        case "javascript-fetch":
            return generateFetchSnippet(normalized);
        case "python-requests":
            return generatePythonSnippet(normalized);
        case "nodejs-axios":
            return generateAxiosSnippet(normalized);
        case "raw-http":
            return generateRawHttpSnippet(normalized);
        default:
            return generateCurlSnippet(normalized);
    }
}

/**
 * Pure JavaScript Syntax Tokenizer & Highlighter
 * Converts code text into colored HTML spans without any third-party library.
 */
export function highlightCode(code, lang = "javascript") {
    if (!code) return "";

    const escapeHtml = (str) =>
        str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    // Line-by-line processing
    const lines = code.split("\n");

    return lines
        .map((line) => {
            if (!line.trim()) return "&nbsp;";

            let escaped = escapeHtml(line);

            if (lang === "bash" || lang === "curl") {
                // Comments
                if (escaped.trim().startsWith("#")) {
                    return `<span class="tok-comment">${escaped}</span>`;
                }
                // Flags (--location, -X, etc.)
                escaped = escaped.replace(/(^|\s)(--?[a-zA-Z0-9_-]+)/g, '$1<span class="tok-flag">$2</span>');
                // Strings in quotes
                escaped = escaped.replace(/('[^']*')/g, '<span class="tok-string">$1</span>');
                escaped = escaped.replace(/(&quot;[^&]*&quot;)/g, '<span class="tok-string">$1</span>');
                // Command name curl
                escaped = escaped.replace(/(^|\s)(curl)(\s|$)/g, '$1<span class="tok-keyword">$2</span>$3');
                return escaped;
            }

            if (lang === "python") {
                // Comments
                if (escaped.trim().startsWith("#")) {
                    return `<span class="tok-comment">${escaped}</span>`;
                }
                // Strings
                escaped = escaped.replace(/(&quot;[^&]*&quot;)/g, '<span class="tok-string">$1</span>');
                escaped = escaped.replace(/('[^']*')/g, '<span class="tok-string">$1</span>');
                // Python Keywords
                escaped = escaped.replace(
                    /\b(import|from|as|def|return|if|else|elif|for|in|while|try|except|None|True|False)\b/g,
                    '<span class="tok-keyword">$1</span>'
                );
                // Function calls
                escaped = escaped.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\()/g, '<span class="tok-fn">$1</span>');
                return escaped;
            }

            // JavaScript & Node.js
            // Comments
            if (escaped.trim().startsWith("//")) {
                return `<span class="tok-comment">${escaped}</span>`;
            }
            // Strings
            escaped = escaped.replace(/(&quot;[^&]*&quot;)/g, '<span class="tok-string">$1</span>');
            escaped = escaped.replace(/('[^']*')/g, '<span class="tok-string">$1</span>');
            escaped = escaped.replace(/(`[^`]*`)/g, '<span class="tok-string">$1</span>');
            // JS Keywords
            escaped = escaped.replace(
                /\b(const|let|var|function|return|if|else|new|try|catch|then|async|await|require|import|from|export)\b/g,
                '<span class="tok-keyword">$1</span>'
            );
            // Builtins / Objects
            escaped = escaped.replace(/\b(Headers|JSON|console|fetch|axios|response|error)\b/g, '<span class="tok-builtin">$1</span>');
            // Function calls
            escaped = escaped.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\()/g, '<span class="tok-fn">$1</span>');

            return escaped;
        })
        .join("\n");
}
