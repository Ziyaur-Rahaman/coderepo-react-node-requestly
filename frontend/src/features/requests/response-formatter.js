/**
 * Response Content-Type Detection & Prettifier Utilities
 * Pure vanilla JavaScript with zero external dependencies.
 */

/**
 * Detects format ('json' | 'xml' | 'html' | 'text') from response headers and body content.
 */
export function detectContentType(headers = {}, bodyText = "") {
    // 1. Inspect Content-Type response header
    const headersObj = headers || {};
    let contentType = "";
    for (const [k, v] of Object.entries(headersObj)) {
        if (k.toLowerCase() === "content-type") {
            contentType = String(v).toLowerCase();
            break;
        }
    }

    if (contentType.includes("json")) return "json";
    if (contentType.includes("xml")) return "xml";
    if (contentType.includes("html")) return "html";
    if (contentType.includes("text/plain")) return "text";

    // 2. Content sniffing fallback if header is ambiguous or missing
    if (!bodyText || typeof bodyText !== "string") return "text";
    const trimmed = bodyText.trim();

    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try {
            JSON.parse(trimmed);
            return "json";
        } catch {}
    }

    if (trimmed.startsWith("<?xml") || (trimmed.startsWith("<") && trimmed.endsWith(">") && !trimmed.toLowerCase().startsWith("<!doctype html") && !trimmed.toLowerCase().startsWith("<html"))) {
        return "xml";
    }

    if (trimmed.toLowerCase().startsWith("<!doctype html") || trimmed.toLowerCase().startsWith("<html")) {
        return "html";
    }

    return "text";
}

/**
 * Prettifies an XML string with 2-space indentation.
 */
export function formatXml(xmlString) {
    if (!xmlString || typeof xmlString !== "string") return "";
    try {
        let formatted = "";
        let indent = 0;
        const tab = "  ";

        // Remove newlines inside elements and normalize
        const cleanXml = xmlString
            .replace(/>\s*</g, "><")
            .replace(/<\?xml([^>]*)\?>/g, "<?xml$1?>\n")
            .trim();

        // Match tags and text content
        const regex = /(<[^>]+>)|([^<]+)/g;
        let match;

        while ((match = regex.exec(cleanXml)) !== null) {
            const token = match[0].trim();
            if (!token) continue;

            if (token.startsWith("<?") || token.startsWith("<!")) {
                formatted += `${token}\n`;
            } else if (token.startsWith("</")) {
                indent = Math.max(0, indent - 1);
                formatted += `${tab.repeat(indent)}${token}\n`;
            } else if (token.startsWith("<") && (token.endsWith("/>") || token.endsWith("/ >"))) {
                formatted += `${tab.repeat(indent)}${token}\n`;
            } else if (token.startsWith("<")) {
                formatted += `${tab.repeat(indent)}${token}\n`;
                // If it's an opening tag (not self-closing), increase indent
                indent++;
            } else {
                // Text node: place inside last opened tag on its own line indented
                formatted += `${tab.repeat(indent)}${token}\n`;
            }
        }

        return formatted.trim();
    } catch {
        return xmlString;
    }
}

/**
 * Prettifies an HTML string with clean indentation.
 */
export function formatHtml(htmlString) {
    if (!htmlString || typeof htmlString !== "string") return "";
    return formatXml(htmlString);
}

/**
 * Prettifies body content based on the target format.
 */
export function formatBody(bodyString, format = "json") {
    if (!bodyString || typeof bodyString !== "string") return "";

    if (format === "json") {
        try {
            const parsed = JSON.parse(bodyString);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return bodyString;
        }
    }

    if (format === "xml") {
        return formatXml(bodyString);
    }

    if (format === "html") {
        return formatHtml(bodyString);
    }

    return bodyString;
}
