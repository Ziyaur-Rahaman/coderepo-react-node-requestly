import React from "react";
import { MaterialIcon } from "./MaterialIcon.jsx";

export function KeyValueTable({
    rows = [],
    onChange,
    keyPlaceholder = "Key",
    valuePlaceholder = "Value",
    showDescription = true,
    disabled = false,
}) {
    const handleCellChange = (index, field, value) => {
        const nextRows = rows.map((row, i) => (i === index ? { ...row, [field]: value } : row));
        // If typing in the last row and key or value has content, append a new blank row
        if (index === rows.length - 1 && (value.trim() !== "" || nextRows[index].key || nextRows[index].value)) {
            nextRows.push({ key: "", value: "", description: "", enabled: true });
        }
        onChange(nextRows);
    };

    const handleToggle = (index) => {
        const nextRows = rows.map((row, i) => (i === index ? { ...row, enabled: !row.enabled } : row));
        onChange(nextRows);
    };

    const handleDelete = (index) => {
        if (rows.length <= 1) {
            onChange([{ key: "", value: "", description: "", enabled: true }]);
            return;
        }
        const nextRows = rows.filter((_, i) => i !== index);
        onChange(nextRows);
    };

    // Ensure at least one empty row exists
    const displayRows = rows.length > 0 ? rows : [{ key: "", value: "", description: "", enabled: true }];

    return (
        <div className="kv-table-container">
            <div className="kv-table-header">
                <span className="kv-col-check"></span>
                <span className="kv-col-key">{keyPlaceholder}</span>
                <span className="kv-col-value">{valuePlaceholder}</span>
                {showDescription && <span className="kv-col-desc">Description</span>}
                <span className="kv-col-actions"></span>
            </div>
            <div className="kv-table-body">
                {displayRows.map((row, index) => {
                    const isLast = index === displayRows.length - 1;
                    return (
                        <div className={`kv-table-row ${!row.enabled ? "is-disabled" : ""}`} key={index}>
                            <div className="kv-col-check">
                                <input
                                    type="checkbox"
                                    checked={row.enabled ?? true}
                                    disabled={disabled || (isLast && !row.key && !row.value)}
                                    onChange={() => handleToggle(index)}
                                    aria-label={`Toggle row ${index + 1}`}
                                />
                            </div>
                            <div className="kv-col-key">
                                <input
                                    type="text"
                                    value={row.key || ""}
                                    placeholder={keyPlaceholder}
                                    disabled={disabled}
                                    onChange={(e) => handleCellChange(index, "key", e.target.value)}
                                    aria-label={`${keyPlaceholder} row ${index + 1}`}
                                />
                            </div>
                            <div className="kv-col-value">
                                <input
                                    type="text"
                                    value={row.value || ""}
                                    placeholder={valuePlaceholder}
                                    disabled={disabled}
                                    onChange={(e) => handleCellChange(index, "value", e.target.value)}
                                    aria-label={`${valuePlaceholder} row ${index + 1}`}
                                />
                            </div>
                            {showDescription && (
                                <div className="kv-col-desc">
                                    <input
                                        type="text"
                                        value={row.description || ""}
                                        placeholder="Description"
                                        disabled={disabled}
                                        onChange={(e) => handleCellChange(index, "description", e.target.value)}
                                        aria-label={`Description row ${index + 1}`}
                                    />
                                </div>
                            )}
                            <div className="kv-col-actions">
                                {(!isLast || row.key || row.value) && (
                                    <button
                                        type="button"
                                        className="icon-button kv-delete-btn"
                                        disabled={disabled}
                                        onClick={() => handleDelete(index)}
                                        title="Delete row"
                                        aria-label={`Delete row ${index + 1}`}
                                    >
                                        <MaterialIcon size={16}>delete</MaterialIcon>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
