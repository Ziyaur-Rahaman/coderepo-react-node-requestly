const baseUrl = import.meta.env.VITE_API_URL || "/api/v1";
let sessionToken = localStorage.getItem("postman-session-token") || "";
let profileToken = localStorage.getItem("postman-profile-token") || "";

export function setSessionToken(token) {
    sessionToken = token || "";
    if (sessionToken) localStorage.setItem("postman-session-token", sessionToken);
    else localStorage.removeItem("postman-session-token");
}

export function setProfileToken(token) {
    profileToken = token || "";
    if (profileToken) localStorage.setItem("postman-profile-token", profileToken);
    else localStorage.removeItem("postman-profile-token");
}

export const hasSessionToken = () => Boolean(sessionToken || profileToken);
export const hasProfileToken = () => Boolean(profileToken);

export async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(profileToken || sessionToken ? { Authorization: `Bearer ${profileToken || sessionToken}` } : {}),
            ...options.headers,
        },
    });
    if (response.status === 204) return null;
    const contentType = response.headers?.get?.("content-type") || "";
    const payload = contentType.includes("application/json") || !response.headers
        ? await response.json()
        : null;
    if (!response.ok) {
        const code = payload?.error?.code;
        const message = payload?.error?.message || `Requestly service returned ${response.status}.`;
        if (response.status === 401 && ["AUTH_REQUIRED", "INVALID_TOKEN", "ACCOUNT_UNAVAILABLE"].includes(code)) {
            setProfileToken(""); setSessionToken(""); localStorage.removeItem("postman-profile-id");
            window.dispatchEvent(new CustomEvent("postman-session-expired", { detail: message }));
        }
        throw new Error(message);
    }
    if (!payload || !("data" in payload)) throw new Error("Requestly service returned an invalid response.");
    return payload.data;
}
