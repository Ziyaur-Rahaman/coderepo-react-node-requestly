import React, { useMemo } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { KeyValueTable } from "../../shared/components/KeyValueTable.jsx";

const BODY_TYPES = [
    { id: "none", label: "none" },
    { id: "json", label: "raw (JSON)" },
    { id: "text", label: "raw (text)" },
    { id: "x-www-form-urlencoded", label: "x-www-form-urlencoded" },
];

export function RequestBodyEditor({ bodyType, onBodyTypeChange, bodyContent, onBodyContentChange }) {
    // Parse x-www-form-urlencoded content into key-value pairs if selected
    const formRows = useMemo(() => {
        if (bodyType !== "x-www-form-urlencoded" || !bodyContent) {
            return [{ key: "", value: "", description: "", enabled: true }];
        }
        try {
            const params = new URLSearchParams(bodyContent);
            const rows = [];
            params.forEach((value, key) => {
                rows.push({ key, value, description: "", enabled: true });
            });
            return rows.length > 0 ? rows : [{ key: "", value: "", description: "", enabled: true }];
        } catch {
            return [{ key: "", value: "", description: "", enabled: true }];
        }
    }, [bodyType, bodyContent]);

    const handleFormRowsChange = (nextRows) => {
        const params = new URLSearchParams();
        nextRows
            .filter((r) => r.enabled && r.key)
            .forEach((r) => {
                params.append(r.key, r.value || "");
            });
        onBodyContentChange(params.toString());
    };

    // JSON syntax validation
    const jsonValidation = useMemo(() => {
        if (bodyType !== "json" || !bodyContent.trim()) {
            return null;
        }
        try {
            JSON.parse(bodyContent);
            return { valid: true, message: "Valid JSON" };
        } catch (error) {
            return { valid: false, message: error.message };
        }
    }, [bodyType, bodyContent]);

    const handleBeautifyJson = () => {
        if (!bodyContent.trim()) return;
        try {
            const parsed = JSON.parse(bodyContent);
            onBodyContentChange(JSON.stringify(parsed, null, 2));
        } catch {}
    };

    return (
        <div className="request-body-editor">
            <div className="body-type-selector">
                {BODY_TYPES.map((type) => (
                    <label key={type.id} className="body-type-label">
                        <input
                            type="radio"
                            name="bodyType"
                            value={type.id}
                            checked={bodyType === type.id}
                            onChange={() => onBodyTypeChange(type.id)}
                        />
                        <span>{type.label}</span>
                    </label>
                ))}

                {bodyType === "json" && (
                    <div className="json-toolbar">
                        {jsonValidation && (
                            <span className={`json-badge ${jsonValidation.valid ? "is-valid" : "is-invalid"}`}>
                                <MaterialIcon size={14}>
                                    {jsonValidation.valid ? "check_circle" : "error"}
                                </MaterialIcon>
                                <span>{jsonValidation.message}</span>
                            </span>
                        )}
                        <button
                            type="button"
                            className="btn-text btn-beautify"
                            onClick={handleBeautifyJson}
                            disabled={!jsonValidation?.valid}
                        >
                            Beautify
                        </button>
                    </div>
                )}
            </div>

            <div className="body-content-pane">
                {bodyType === "none" && (
                    <div className="empty-body-hint">
                        <MaterialIcon size={28}>tune</MaterialIcon>
                        <p>This request does not have a body.</p>
                    </div>
                )}

                {(bodyType === "json" || bodyType === "text") && (
                    <textarea
                        className="code-editor-textarea"
                        value={bodyContent}
                        placeholder={bodyType === "json" ? "{\n  \"key\": \"value\"\n}" : "Enter plain text body..."}
                        onChange={(e) => onBodyContentChange(e.target.value)}
                        spellCheck="false"
                        aria-label="Request Body Content"
                    />
                )}

                {bodyType === "x-www-form-urlencoded" && (
                    <KeyValueTable
                        rows={formRows}
                        onChange={handleFormRowsChange}
                        keyPlaceholder="Parameter"
                        valuePlaceholder="Value"
                        showDescription={false}
                    />
                )}
            </div>
        </div>
    );
}
