/**
 * Variable resolution engine for Postman {{variableName}} syntax.
 */

const VARIABLE_REGEX = /\{\{([^{}]+)\}\}/g;

/**
 * Normalizes an array of environment variables or an object map into a key-value dictionary.
 * Only enabled variables are included.
 */
export function buildVariablesMap(variables) {
    if (!variables) return {};
    if (!Array.isArray(variables)) {
        return typeof variables === "object" ? variables : {};
    }

    const map = {};
    for (const v of variables) {
        if (v && v.key && v.enabled !== false) {
            map[v.key.trim()] = v.value ?? "";
        }
    }
    return map;
}

/**
 * Replaces all occurrences of {{key}} in a string with matching values from variablesMap.
 * If the key is not in variablesMap, the placeholder {{key}} is preserved.
 */
export function resolveString(str, variablesMap = {}) {
    if (typeof str !== "string" || !str.includes("{{")) {
        return str;
    }

    return str.replace(VARIABLE_REGEX, (match, rawKey) => {
        const key = rawKey.trim();
        if (Object.prototype.hasOwnProperty.call(variablesMap, key)) {
            return String(variablesMap[key]);
        }
        return match;
    });
}

/**
 * Resolves variables in query parameters array: [{ key, value, description, enabled }]
 */
export function resolveQueryParams(queryParams = [], variablesMap = {}) {
    if (!Array.isArray(queryParams)) return [];
    return queryParams.map((param) => {
        if (!param) return param;
        return {
            ...param,
            key: resolveString(param.key, variablesMap),
            value: resolveString(param.value, variablesMap),
        };
    });
}

/**
 * Resolves variables in headers array: [{ key, value, description, enabled }]
 */
export function resolveHeaders(headers = [], variablesMap = {}) {
    if (!Array.isArray(headers)) return [];
    return headers.map((header) => {
        if (!header) return header;
        return {
            ...header,
            key: resolveString(header.key, variablesMap),
            value: resolveString(header.value, variablesMap),
        };
    });
}

/**
 * Resolves variables in request body content string.
 */
export function resolveRequestBody(bodyContent = "", variablesMap = {}) {
    return resolveString(bodyContent, variablesMap);
}

/**
 * Resolves variables in authentication configuration.
 */
export function resolveAuthConfig(auth = {}, variablesMap = {}) {
    if (!auth || typeof auth !== "object") {
        return { type: "none", config: {} };
    }

    const type = auth.type || "none";
    const rawConfig = auth.config || {};
    const resolvedConfig = {};

    if (type === "bearer") {
        resolvedConfig.token = resolveString(rawConfig.token || "", variablesMap);
    } else if (type === "basic") {
        resolvedConfig.username = resolveString(rawConfig.username || "", variablesMap);
        resolvedConfig.password = resolveString(rawConfig.password || "", variablesMap);
    } else if (type === "apiKey") {
        resolvedConfig.key = resolveString(rawConfig.key || "", variablesMap);
        resolvedConfig.value = resolveString(rawConfig.value || "", variablesMap);
        resolvedConfig.addTo = rawConfig.addTo === "queryParams" ? "queryParams" : "header";
    }

    return {
        type,
        config: resolvedConfig,
    };
}

/**
 * Resolves all parts of a request config before execution.
 */
export function resolveRequestConfig(config = {}, variables = []) {
    const map = buildVariablesMap(variables);
    return {
        ...config,
        url: resolveString(config.url || "", map),
        queryParams: resolveQueryParams(config.queryParams || [], map),
        headers: resolveHeaders(config.headers || [], map),
        bodyContent: resolveRequestBody(config.bodyContent || "", map),
        auth: resolveAuthConfig(config.auth || {}, map),
    };
}

