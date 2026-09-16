import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { environmentApi } from "./environment.api.js";

export function EnvironmentModal({ open, environment, onClose, onSaved }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [variables, setVariables] = useState([]);
    const [revealedKeys, setRevealedKeys] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const nameInputRef = useRef(null);

    useEffect(() => {
        if (open) {
            setError("");
            if (environment) {
                setName(environment.name || "");
                setDescription(environment.description || "");
                const vars = (environment.variables || []).map((v) => ({
                    key: v.key || "",
                    value: v.value ?? "",
                    type: v.type === "secret" ? "secret" : "default",
                    enabled: v.enabled !== false,
                }));
                // Ensure at least one blank row
                if (vars.length === 0 || vars[vars.length - 1].key) {
                    vars.push({ key: "", value: "", type: "default", enabled: true });
                }
                setVariables(vars);
            } else {
                setName("");
                setDescription("");
                setVariables([
                    { key: "baseUrl", value: "http://localhost:8000", type: "default", enabled: true },
                    { key: "apiKey", value: "", type: "secret", enabled: true },
                    { key: "", value: "", type: "default", enabled: true },
                ]);
            }
            setRevealedKeys({});
            setTimeout(() => {
                nameInputRef.current?.focus();
            }, 50);
        }
    }, [open, environment]);

    if (!open) return null;

    const handleVariableChange = (index, field, value) => {
        const next = [...variables];
        next[index] = { ...next[index], [field]: value };

        // Automatically append empty row if typing in last row's key or value
        if (index === next.length - 1 && (next[index].key || next[index].value)) {
            next.push({ key: "", value: "", type: "default", enabled: true });
        }

        setVariables(next);
    };

    const handleRemoveVariable = (index) => {
        const next = variables.filter((_, i) => i !== index);
        if (next.length === 0) {
            next.push({ key: "", value: "", type: "default", enabled: true });
        }
        setVariables(next);
    };

    const handleAddVariable = () => {
        setVariables([...variables, { key: "", value: "", type: "default", enabled: true }]);
    };

    const toggleSecretReveal = (key) => {
        setRevealedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleApplyTemplate = (templateKey, templateType = "default", defaultValue = "") => {
        // If already exists, don't duplicate
        if (variables.some((v) => v.key.trim().toLowerCase() === templateKey.toLowerCase())) {
            return;
        }
        // Insert before the last empty row or at end
        const next = [...variables];
        const last = next[next.length - 1];
        if (last && !last.key && !last.value) {
            next[next.length - 1] = {
                key: templateKey,
                value: defaultValue,
                type: templateType,
                enabled: true,
            };
            next.push({ key: "", value: "", type: "default", enabled: true });
        } else {
            next.push({
                key: templateKey,
                value: defaultValue,
                type: templateType,
                enabled: true,
            });
            next.push({ key: "", value: "", type: "default", enabled: true });
        }
        setVariables(next);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Environment name is required.");
            nameInputRef.current?.focus();
            return;
        }

        // Clean variables: filter out completely empty keys
        const cleanedVars = variables
            .map((v) => ({
                key: v.key.trim(),
                value: String(v.value ?? ""),
                type: v.type === "secret" ? "secret" : "default",
                enabled: v.enabled !== false,
            }))
            .filter((v) => Boolean(v.key));

        // Check duplicate keys
        const seenKeys = new Set();
        for (const v of cleanedVars) {
            const lower = v.key.toLowerCase();
            if (seenKeys.has(lower)) {
                setError(`Duplicate variable name: "${v.key}". Variables must have unique names.`);
                return;
            }
            seenKeys.add(lower);
        }

        setLoading(true);
        setError("");

        try {
            const payload = {
                name: trimmedName,
                description: description.trim(),
                variables: cleanedVars,
            };

            let result;
            if (environment?._id) {
                result = await environmentApi.update(environment._id, payload);
            } else {
                result = await environmentApi.create(payload);
            }

            if (onSaved) onSaved(result);
            onClose();
        } catch (err) {
            setError(err.message || "Failed to save environment.");
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="env-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div
                className="modal-content environment-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <div className="modal-title-wrap">
                        <MaterialIcon size={20} className="modal-icon-title">
                            layers
                        </MaterialIcon>
                        <h3>{environment?._id ? "Edit Environment" : "New Environment"}</h3>
                    </div>
                    <button
                        type="button"
                        className="icon-button modal-close-btn"
                        onClick={onClose}
                        title="Close"
                        aria-label="Close modal"
                    >
                        <MaterialIcon size={18}>close</MaterialIcon>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="environment-form">
                    <div className="modal-body">
                        {error && (
                            <div className="modal-error-banner" role="alert">
                                <MaterialIcon size={16}>error_outline</MaterialIcon>
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="env-name-input">
                                Environment Name <span className="field-required">*</span>
                            </label>
                            <input
                                id="env-name-input"
                                ref={nameInputRef}
                                type="text"
                                className="form-input"
                                placeholder="e.g. Development, Staging, Production"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (error) setError("");
                                }}
                                disabled={loading}
                                maxLength={120}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="env-desc-input">Description (optional)</label>
                            <input
                                id="env-desc-input"
                                type="text"
                                className="form-input"
                                placeholder="e.g. Local dev servers and mock tokens"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={loading}
                                maxLength={1024}
                            />
                        </div>

                        {/* Quick variable templates */}
                        <div className="env-quick-templates">
                            <span className="quick-templates-label">Quick variables:</span>
                            <button
                                type="button"
                                className="template-chip-btn"
                                onClick={() => handleApplyTemplate("baseUrl", "default", "http://localhost:8000")}
                            >
                                + baseUrl
                            </button>
                            <button
                                type="button"
                                className="template-chip-btn"
                                onClick={() => handleApplyTemplate("apiKey", "secret", "")}
                            >
                                + apiKey
                            </button>
                            <button
                                type="button"
                                className="template-chip-btn"
                                onClick={() => handleApplyTemplate("userId", "default", "1")}
                            >
                                + userId
                            </button>
                            <button
                                type="button"
                                className="template-chip-btn"
                                onClick={() => handleApplyTemplate("token", "secret", "")}
                            >
                                + token
                            </button>
                        </div>

                        {/* Variables table */}
                        <div className="env-variables-section">
                            <div className="env-variables-header">
                                <h4>Environment Variables ({variables.filter((v) => v.key.trim()).length})</h4>
                                <span className="env-variables-tip">
                                    Use <code>{"{{variableName}}"}</code> in URL, params, headers, or body
                                </span>
                            </div>

                            <div className="env-variables-table-container">
                                <table className="env-variables-table">
                                    <thead>
                                        <tr>
                                            <th className="col-check" title="Enable / Disable"></th>
                                            <th className="col-key">Variable</th>
                                            <th className="col-type">Type</th>
                                            <th className="col-val">Value</th>
                                            <th className="col-action"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {variables.map((item, index) => {
                                            const isSecret = item.type === "secret";
                                            const isRevealed = Boolean(revealedKeys[index]);

                                            return (
                                                <tr key={index} className={!item.enabled ? "row-disabled" : ""}>
                                                    <td className="col-check">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.enabled}
                                                            onChange={(e) =>
                                                                handleVariableChange(index, "enabled", e.target.checked)
                                                            }
                                                            title={item.enabled ? "Disable variable" : "Enable variable"}
                                                            aria-label={`Enable variable ${item.key || index}`}
                                                        />
                                                    </td>
                                                    <td className="col-key">
                                                        <input
                                                            type="text"
                                                            className="table-cell-input"
                                                            placeholder="New variable..."
                                                            value={item.key}
                                                            onChange={(e) =>
                                                                handleVariableChange(index, "key", e.target.value)
                                                            }
                                                            disabled={loading}
                                                        />
                                                    </td>
                                                    <td className="col-type">
                                                        <select
                                                            className="table-cell-select"
                                                            value={item.type}
                                                            onChange={(e) =>
                                                                handleVariableChange(index, "type", e.target.value)
                                                            }
                                                            disabled={loading}
                                                            title="Variable type"
                                                        >
                                                            <option value="default">default</option>
                                                            <option value="secret">secret</option>
                                                        </select>
                                                    </td>
                                                    <td className="col-val">
                                                        <div className="env-val-input-wrap">
                                                            <input
                                                                type={isSecret && !isRevealed ? "password" : "text"}
                                                                className={`table-cell-input ${isSecret ? "secret-input" : ""}`}
                                                                placeholder="Value"
                                                                value={item.value}
                                                                onChange={(e) =>
                                                                    handleVariableChange(index, "value", e.target.value)
                                                                }
                                                                disabled={loading}
                                                            />
                                                            {isSecret && (
                                                                <button
                                                                    type="button"
                                                                    className="env-val-reveal-btn"
                                                                    onClick={() => toggleSecretReveal(index)}
                                                                    title={isRevealed ? "Mask secret" : "Reveal secret"}
                                                                    tabIndex={-1}
                                                                >
                                                                    <MaterialIcon size={14}>
                                                                        {isRevealed ? "visibility_off" : "visibility"}
                                                                    </MaterialIcon>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="col-action">
                                                        {(item.key || item.value || variables.length > 1) && (
                                                            <button
                                                                type="button"
                                                                className="icon-button cell-delete-btn"
                                                                onClick={() => handleRemoveVariable(index)}
                                                                title="Delete variable"
                                                                aria-label={`Delete variable ${item.key || index}`}
                                                            >
                                                                <MaterialIcon size={15}>delete_outline</MaterialIcon>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                type="button"
                                className="btn-add-var-row"
                                onClick={handleAddVariable}
                            >
                                <MaterialIcon size={16}>add</MaterialIcon>
                                <span>Add Variable</span>
                            </button>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-small" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <span>{environment?._id ? "Save Changes" : "Create Environment"}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
