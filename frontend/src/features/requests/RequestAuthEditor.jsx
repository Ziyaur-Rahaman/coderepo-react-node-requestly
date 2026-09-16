import React, { useState } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

const AUTH_TYPES = [
    { id: "none", label: "No Auth", desc: "This request does not use any authorization." },
    { id: "bearer", label: "Bearer Token", desc: "Send an OAuth 2.0 or personal access Bearer token in the Authorization header." },
    { id: "basic", label: "Basic Auth", desc: "Send HTTP Basic authentication with username and password base64-encoded." },
    { id: "apiKey", label: "API Key", desc: "Send an API key as a custom request header or URL query parameter." },
];

export function RequestAuthEditor({
    auth = { type: "none", config: {} },
    onChange,
    activeEnvironment,
    variablesMap = {},
}) {
    const currentType = auth?.type || "none";
    const config = auth?.config || {};

    // Mask/reveal states for secret fields
    const [revealToken, setRevealToken] = useState(false);
    const [revealPassword, setRevealPassword] = useState(false);
    const [revealApiKey, setRevealApiKey] = useState(false);

    const handleTypeChange = (newType) => {
        let newConfig = {};
        if (newType === "bearer") {
            newConfig = { token: config.token || "" };
        } else if (newType === "basic") {
            newConfig = { username: config.username || "", password: config.password || "" };
        } else if (newType === "apiKey") {
            newConfig = {
                key: config.key || "X-API-Key",
                value: config.value || "",
                addTo: config.addTo || "header",
            };
        }
        onChange({
            type: newType,
            config: newConfig,
        });
    };

    const handleConfigChange = (field, value) => {
        onChange({
            type: currentType,
            config: {
                ...config,
                [field]: value,
            },
        });
    };

    // Helper to resolve {{variable}} in preview
    const resolvePreview = (str) => {
        if (!str || typeof str !== "string") return "";
        return str.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
            const trimmed = key.trim();
            if (Object.prototype.hasOwnProperty.call(variablesMap, trimmed)) {
                return variablesMap[trimmed];
            }
            return match;
        });
    };

    return (
        <div className="request-auth-pane">
            <div className="auth-sidebar-selector">
                <div className="auth-type-label">Type</div>
                <div className="auth-type-list">
                    {AUTH_TYPES.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            className={`auth-type-item ${currentType === t.id ? "active" : ""}`}
                            onClick={() => handleTypeChange(t.id)}
                        >
                            <span className="auth-type-radio">
                                <MaterialIcon size={16}>
                                    {currentType === t.id ? "radio_button_checked" : "radio_button_unchecked"}
                                </MaterialIcon>
                            </span>
                            <span className="auth-type-title">{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="auth-details-content">
                <div className="auth-type-description">
                    <p>{AUTH_TYPES.find((t) => t.id === currentType)?.desc}</p>
                </div>

                {/* NO AUTH */}
                {currentType === "none" && (
                    <div className="auth-none-box">
                        <span className="auth-none-icon">
                            <MaterialIcon size={24}>lock</MaterialIcon>
                        </span>
                        <h4>No Authentication Attached</h4>
                        <p>Outbound requests will not include credentials. Select another type on the left if this endpoint requires authentication.</p>
                    </div>
                )}

                {/* BEARER TOKEN */}
                {currentType === "bearer" && (
                    <div className="auth-form-card">
                        <div className="auth-field-row">
                            <label htmlFor="bearer-token-input">Token</label>
                            <div className="auth-input-wrapper">
                                <input
                                    id="bearer-token-input"
                                    type={revealToken ? "text" : "password"}
                                    className="auth-text-input"
                                    placeholder="Enter Bearer token or {{variable}}"
                                    value={config.token || ""}
                                    onChange={(e) => handleConfigChange("token", e.target.value)}
                                    autoComplete="off"
                                />
                                <button
                                    type="button"
                                    className="auth-reveal-btn"
                                    onClick={() => setRevealToken(!revealToken)}
                                    title={revealToken ? "Mask token" : "Show token"}
                                >
                                    <MaterialIcon size={16}>
                                        {revealToken ? "visibility_off" : "visibility"}
                                    </MaterialIcon>
                                </button>
                            </div>
                        </div>

                        {/* Live Header Preview */}
                        <div className="auth-live-preview">
                            <span className="preview-lbl">Preview Header:</span>
                            <code className="preview-code">
                                Authorization: Bearer {config.token ? (
                                    config.token.includes("{{") ? (
                                        <>
                                            <span className="var-token">{config.token}</span>
                                            {activeEnvironment && (
                                                <span className="resolved-hint">
                                                    {" "}→ {resolvePreview(config.token)}
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        revealToken ? config.token : "••••••••••••••••"
                                    )
                                ) : (
                                    <span className="empty-hint">&lt;token&gt;</span>
                                )}
                            </code>
                        </div>
                    </div>
                )}

                {/* BASIC AUTH */}
                {currentType === "basic" && (
                    <div className="auth-form-card">
                        <div className="auth-field-row">
                            <label htmlFor="basic-username-input">Username</label>
                            <input
                                id="basic-username-input"
                                type="text"
                                className="auth-text-input"
                                placeholder="Enter username or {{variable}}"
                                value={config.username || ""}
                                onChange={(e) => handleConfigChange("username", e.target.value)}
                                autoComplete="off"
                            />
                        </div>

                        <div className="auth-field-row">
                            <label htmlFor="basic-password-input">Password</label>
                            <div className="auth-input-wrapper">
                                <input
                                    id="basic-password-input"
                                    type={revealPassword ? "text" : "password"}
                                    className="auth-text-input"
                                    placeholder="Enter password or {{variable}}"
                                    value={config.password || ""}
                                    onChange={(e) => handleConfigChange("password", e.target.value)}
                                    autoComplete="off"
                                />
                                <button
                                    type="button"
                                    className="auth-reveal-btn"
                                    onClick={() => setRevealPassword(!revealPassword)}
                                    title={revealPassword ? "Mask password" : "Show password"}
                                >
                                    <MaterialIcon size={16}>
                                        {revealPassword ? "visibility_off" : "visibility"}
                                    </MaterialIcon>
                                </button>
                            </div>
                        </div>

                        {/* Live Header Preview */}
                        <div className="auth-live-preview">
                            <span className="preview-lbl">Preview Header:</span>
                            <code className="preview-code">
                                Authorization: Basic {config.username || config.password ? (
                                    config.username?.includes("{{") || config.password?.includes("{{") ? (
                                        <>
                                            <span className="var-token">
                                                base64({config.username || ""}:{revealPassword ? config.password || "" : "••••"})
                                            </span>
                                            {activeEnvironment && (
                                                <span className="resolved-hint">
                                                    {" "}→ base64({resolvePreview(config.username || "")}:{resolvePreview(config.password || "")})
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        btoa(`${config.username || ""}:${config.password || ""}`)
                                    )
                                ) : (
                                    <span className="empty-hint">&lt;base64-encoded-credentials&gt;</span>
                                )}
                            </code>
                        </div>
                    </div>
                )}

                {/* API KEY */}
                {currentType === "apiKey" && (
                    <div className="auth-form-card">
                        <div className="auth-field-row">
                            <label htmlFor="api-key-name-input">Key Name</label>
                            <input
                                id="api-key-name-input"
                                type="text"
                                className="auth-text-input"
                                placeholder="e.g. X-API-Key, api_key, token"
                                value={config.key || ""}
                                onChange={(e) => handleConfigChange("key", e.target.value)}
                                autoComplete="off"
                            />
                        </div>

                        <div className="auth-field-row">
                            <label htmlFor="api-key-value-input">Value</label>
                            <div className="auth-input-wrapper">
                                <input
                                    id="api-key-value-input"
                                    type={revealApiKey ? "text" : "password"}
                                    className="auth-text-input"
                                    placeholder="Enter API key value or {{variable}}"
                                    value={config.value || ""}
                                    onChange={(e) => handleConfigChange("value", e.target.value)}
                                    autoComplete="off"
                                />
                                <button
                                    type="button"
                                    className="auth-reveal-btn"
                                    onClick={() => setRevealApiKey(!revealApiKey)}
                                    title={revealApiKey ? "Mask value" : "Show value"}
                                >
                                    <MaterialIcon size={16}>
                                        {revealApiKey ? "visibility_off" : "visibility"}
                                    </MaterialIcon>
                                </button>
                            </div>
                        </div>

                        <div className="auth-field-row">
                            <label htmlFor="api-key-add-to-select">Add To</label>
                            <select
                                id="api-key-add-to-select"
                                className="auth-select-input"
                                value={config.addTo || "header"}
                                onChange={(e) => handleConfigChange("addTo", e.target.value)}
                            >
                                <option value="header">Header</option>
                                <option value="queryParams">Query Params</option>
                            </select>
                        </div>

                        {/* Live Injection Preview */}
                        <div className="auth-live-preview">
                            <span className="preview-lbl">
                                Preview {config.addTo === "queryParams" ? "Query Parameter" : "Header"}:
                            </span>
                            <code className="preview-code">
                                {config.addTo === "queryParams" ? (
                                    <>
                                        ?{config.key || "key"}={config.value ? (
                                            config.value.includes("{{") ? (
                                                <>
                                                    <span className="var-token">{config.value}</span>
                                                    {activeEnvironment && (
                                                        <span className="resolved-hint">
                                                            {" "}→ {resolvePreview(config.value)}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                revealApiKey ? config.value : "••••••••"
                                            )
                                        ) : (
                                            <span className="empty-hint">&lt;value&gt;</span>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {config.key || "X-API-Key"}: {config.value ? (
                                            config.value.includes("{{") ? (
                                                <>
                                                    <span className="var-token">{config.value}</span>
                                                    {activeEnvironment && (
                                                        <span className="resolved-hint">
                                                            {" "}→ {resolvePreview(config.value)}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                revealApiKey ? config.value : "••••••••"
                                            )
                                        ) : (
                                            <span className="empty-hint">&lt;value&gt;</span>
                                        )}
                                    </>
                                )}
                            </code>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
