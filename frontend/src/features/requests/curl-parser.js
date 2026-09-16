/**
 * cURL Command Parser for Postman Application
 * Converts multiline/standard cURL command strings into normalized Request Builder configuration.
 * Strictly vanilla JS with zero third-party dependencies.
 */

/**
 * Splits a command string into arguments/tokens respecting single quotes, double quotes, and backslash escaping.
 * @param {string} text - Command line string
 * @returns {string[]} array of parsed tokens
 */
export function tokenizeCommandLine(text) {
    if (!text || typeof text !== "string") return [];

    // Clean up leading $ or # prompt markers and normalize newlines
    let cleaned = text.trim();
    if (cleaned.startsWith("$") || cleaned.startsWith("#")) {
        cleaned = cleaned.substring(1).trim();
    }

    // Merge line continuations: backslash followed by newline
    cleaned = cleaned.replace(/\\\r?\n/g, " ");
    // Also handle Windows ^ line continuations
    cleaned = cleaned.replace(/\^\r?\n/g, " ");

    const tokens = [];
    let current = "";
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let isEscaped = false;

    for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (isEscaped) {
            current += char;
            isEscaped = false;
            continue;
        }

        if (char === "\\") {
            if (inSingleQuote) {
                // In single quotes, backslash is literal
                current += char;
            } else {
                isEscaped = true;
            }
            continue;
        }

        if (char === "'" && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote;
            continue;
        }

        if (char === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
            continue;
        }

        if ((char === " " || char === "\t") && !inSingleQuote && !inDoubleQuote) {
            if (current.length > 0) {
                tokens.push(current);
                current = "";
            }
            continue;
        }

        current += char;
    }

    if (current.length > 0) {
        tokens.push(current);
    }

    return tokens;
}

/**
 * Base64 decoder with fallback
 */
function decodeBase64(str) {
    try {
        if (typeof atob === "function") {
            return atob(str);
        }
    } catch {}
    try {
        if (typeof Buffer !== "undefined") {
            return Buffer.from(str, "base64").toString("utf-8");
        }
    } catch {}
    return str;
}

/**
 * Parses a cURL command into application request configuration.
 * @param {string} curlCommand
 * @returns {Object} parsed request configuration
 */
export function parseCurlCommand(curlCommand) {
    if (!curlCommand || typeof curlCommand !== "string" || !curlCommand.trim()) {
        throw new Error("Please enter a cURL command to import.");
    }

    const tokens = tokenizeCommandLine(curlCommand);

    if (tokens.length === 0) {
        throw new Error("No command arguments found in input.");
    }

    // Verify first token is curl
    const firstToken = tokens[0].toLowerCase();
    if (firstToken !== "curl" && !firstToken.endsWith("/curl")) {
        throw new Error("Invalid cURL command: Command must start with 'curl'.");
    }

    let method = null;
    let url = "";
    const rawHeaders = [];
    const dataParts = [];
    let basicUserPass = null;

    let i = 1;
    while (i < tokens.length) {
        const token = tokens[i];

        // HTTP Method flags
        if (token === "-X" || token === "--request") {
            if (i + 1 < tokens.length) {
                method = tokens[i + 1].toUpperCase();
                i += 2;
                continue;
            }
        } else if (token.startsWith("-X") && token.length > 2) {
            method = token.substring(2).toUpperCase();
            i += 1;
            continue;
        }

        // Header flags
        if (token === "-H" || token === "--header") {
            if (i + 1 < tokens.length) {
                rawHeaders.push(tokens[i + 1]);
                i += 2;
                continue;
            }
        } else if (token.startsWith("-H") && token.length > 2) {
            rawHeaders.push(token.substring(2));
            i += 1;
            continue;
        }

        // Basic Auth flags
        if (token === "-u" || token === "--user") {
            if (i + 1 < tokens.length) {
                basicUserPass = tokens[i + 1];
                i += 2;
                continue;
            }
        } else if (token.startsWith("-u") && token.length > 2) {
            basicUserPass = token.substring(2);
            i += 1;
            continue;
        }

        // Body Data flags
        if (
            token === "-d" ||
            token === "--data" ||
            token === "--data-raw" ||
            token === "--data-binary" ||
            token === "--data-urlencode"
        ) {
            if (i + 1 < tokens.length) {
                dataParts.push(tokens[i + 1]);
                i += 2;
                continue;
            }
        } else if (token.startsWith("-d") && token.length > 2) {
            dataParts.push(token.substring(2));
            i += 1;
            continue;
        }

        // Explicit URL flag
        if (token === "--url") {
            if (i + 1 < tokens.length) {
                url = tokens[i + 1];
                i += 2;
                continue;
            }
        }

        // Ignored cURL flags (location, verbose, silent, insecure, etc.)
        if (
            token === "-L" ||
            token === "--location" ||
            token === "-v" ||
            token === "--verbose" ||
            token === "-s" ||
            token === "--silent" ||
            token === "-k" ||
            token === "--insecure" ||
            token === "-i" ||
            token === "--include" ||
            token === "-compressed" ||
            token === "--compressed"
        ) {
            i += 1;
            continue;
        }

        // Flags with an argument that we safely skip if not handled
        if (
            token === "-m" ||
            token === "--max-time" ||
            token === "--connect-timeout" ||
            token === "-A" ||
            token === "--user-agent" ||
            token === "-e" ||
            token === "--referer" ||
            token === "-o" ||
            token === "--output"
        ) {
            i += 2;
            continue;
        }

        // If not a flag and url is not set yet, assume it's the target URL
        if (!token.startsWith("-") && !url) {
            url = token;
            i += 1;
            continue;
        }

        // Skip unrecognized token
        i += 1;
    }

    if (!url) {
        throw new Error("Invalid cURL command: No destination URL could be found.");
    }

    // Default method: POST if body data is present and method was not explicitly given; otherwise GET
    if (!method) {
        method = dataParts.length > 0 ? "POST" : "GET";
    }

    // 1. Process URL and Query Parameters
    let baseUrl = url;
    const queryParams = [];

    try {
        // Attempt parsing as full URL
        const parsedUrl = new URL(url.match(/^https?:\/\//i) ? url : `http://${url}`);
        parsedUrl.searchParams.forEach((val, key) => {
            queryParams.push({
                key,
                value: val,
                description: "",
                enabled: true,
            });
        });

        // Strip query string from baseUrl for clean input
        if (parsedUrl.search) {
            const qIdx = url.indexOf("?");
            if (qIdx !== -1) {
                baseUrl = url.substring(0, qIdx);
            }
        }
    } catch {
        // Fallback: manually parse query string if URL contains '?'
        const qIdx = url.indexOf("?");
        if (qIdx !== -1) {
            baseUrl = url.substring(0, qIdx);
            const queryStr = url.substring(qIdx + 1);
            const pairs = queryStr.split("&");
            for (const pair of pairs) {
                if (!pair) continue;
                const eqIdx = pair.indexOf("=");
                if (eqIdx !== -1) {
                    queryParams.push({
                        key: decodeURIComponent(pair.substring(0, eqIdx)),
                        value: decodeURIComponent(pair.substring(eqIdx + 1)),
                        description: "",
                        enabled: true,
                    });
                } else {
                    queryParams.push({
                        key: decodeURIComponent(pair),
                        value: "",
                        description: "",
                        enabled: true,
                    });
                }
            }
        }
    }

    if (queryParams.length === 0) {
        queryParams.push({ key: "", value: "", description: "", enabled: true });
    }

    // 2. Process Headers & Authentication
    let auth = { type: "none", config: {} };
    const headers = [];
    let contentType = "";

    // If -u / --user flag was supplied
    if (basicUserPass) {
        const colonIdx = basicUserPass.indexOf(":");
        const username = colonIdx !== -1 ? basicUserPass.substring(0, colonIdx) : basicUserPass;
        const password = colonIdx !== -1 ? basicUserPass.substring(colonIdx + 1) : "";
        auth = {
            type: "basic",
            config: { username, password },
        };
    }

    for (const raw of rawHeaders) {
        const colonIdx = raw.indexOf(":");
        if (colonIdx === -1) continue;

        const key = raw.substring(0, colonIdx).trim();
        const value = raw.substring(colonIdx + 1).trim();

        if (!key) continue;

        const lowerKey = key.toLowerCase();

        if (lowerKey === "content-type") {
            contentType = value.toLowerCase();
        }

        // Detect Bearer Token Auth
        if (lowerKey === "authorization" && value.toLowerCase().startsWith("bearer ")) {
            const token = value.substring(7).trim();
            auth = {
                type: "bearer",
                config: { token },
            };
            continue; // Do not duplicate in headers table
        }

        // Detect Basic Auth in Header
        if (lowerKey === "authorization" && value.toLowerCase().startsWith("basic ")) {
            const encoded = value.substring(6).trim();
            const decoded = decodeBase64(encoded);
            const cIdx = decoded.indexOf(":");
            const username = cIdx !== -1 ? decoded.substring(0, cIdx) : decoded;
            const password = cIdx !== -1 ? decoded.substring(cIdx + 1) : "";
            auth = {
                type: "basic",
                config: { username, password },
            };
            continue; // Do not duplicate in headers table
        }

        // Detect API Key Header
        if (
            (lowerKey === "x-api-key" || lowerKey === "api-key" || lowerKey === "apikey") &&
            auth.type === "none"
        ) {
            auth = {
                type: "apiKey",
                config: { key, value, addTo: "header" },
            };
            continue;
        }

        headers.push({
            key,
            value,
            description: "",
            enabled: true,
        });
    }

    // Detect API Key in Query Parameters if auth not yet set
    if (auth.type === "none") {
        const apiKeyParam = queryParams.find(
            (p) => p.enabled && ["api_key", "apikey", "access_token", "key"].includes(p.key.toLowerCase())
        );
        if (apiKeyParam && apiKeyParam.key) {
            auth = {
                type: "apiKey",
                config: { key: apiKeyParam.key, value: apiKeyParam.value, addTo: "queryParams" },
            };
            // Remove from queryParams table so it's managed via Auth tab
            const idx = queryParams.indexOf(apiKeyParam);
            if (idx !== -1) queryParams.splice(idx, 1);
        }
    }

    if (headers.length === 0) {
        headers.push({ key: "", value: "", description: "", enabled: true });
    }

    // 3. Process Body
    let bodyContent = "";
    let bodyType = "none";

    if (dataParts.length > 0) {
        bodyContent = dataParts.join("&");

        // Format detection
        let isJson = false;
        try {
            JSON.parse(bodyContent);
            isJson = true;
        } catch {}

        if (isJson || contentType.includes("application/json")) {
            bodyType = "json";
            try {
                // Prettify JSON body
                const parsed = JSON.parse(bodyContent);
                bodyContent = JSON.stringify(parsed, null, 2);
            } catch {}
        } else if (contentType.includes("application/xml") || contentType.includes("text/xml")) {
            bodyType = "xml";
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
            bodyType = "form-urlencoded";
        } else {
            bodyType = "raw";
        }
    }

    // Request Name derived from URL path or method
    let requestName = "Imported Request";
    try {
        const pathPart = new URL(baseUrl.match(/^https?:\/\//i) ? baseUrl : `http://${baseUrl}`).pathname;
        if (pathPart && pathPart !== "/") {
            requestName = `${method} ${pathPart}`;
        }
    } catch {}

    return {
        method,
        url: baseUrl,
        fullUrl: url,
        queryParams,
        headers,
        bodyType,
        bodyContent,
        auth,
        requestName,
    };
}
