/**
 * Frontend variable resolution and preview utilities.
 */

const VARIABLE_REGEX = /\{\{([^{}]+)\}\}/g;

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

export function extractVariableNames(str) {
    if (typeof str !== "string" || !str.includes("{{")) {
        return [];
    }
    const matches = [];
    let match;
    const regex = new RegExp(VARIABLE_REGEX);
    while ((match = regex.exec(str)) !== null) {
        matches.push(match[1].trim());
    }
    return [...new Set(matches)];
}

export function hasVariables(str) {
    return typeof str === "string" && str.includes("{{") && str.includes("}}");
}
