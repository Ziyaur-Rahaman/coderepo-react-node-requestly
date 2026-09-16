import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

export function EnvironmentQuickLook({
    activeEnvironment,
    onEditEnvironment,
    onCreateEnvironment,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [revealedSecrets, setRevealedSecrets] = useState({});
    const [copiedKey, setCopiedKey] = useState(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 16 });
    const btnRef = useRef(null);

    const openPopover = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const width = 500;
            let left = rect.left;
            if (left + width > window.innerWidth - 16) {
                left = window.innerWidth - width - 16;
            }
            if (left < 16) {
                left = 16;
            }
            setMenuPos({
                top: Math.round(rect.bottom + 8),
                left: Math.round(left),
            });
        }
        setIsOpen(true);
    };

    // Close on outside click or escape
    useEffect(() => {
        if (!isOpen) return;
        const handleOutside = (e) => {
            if (
                btnRef.current && !btnRef.current.contains(e.target) &&
                !document.getElementById("env-quicklook-portal")?.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        const handleEscape = (e) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        const tid = setTimeout(() => {
            document.addEventListener("mousedown", handleOutside);
            document.addEventListener("keydown", handleEscape);
        }, 30);
        return () => {
            clearTimeout(tid);
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen]);

    const toggleSecret = (key) => {
        setRevealedSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const copyValue = (key, value) => {
        navigator.clipboard.writeText(value);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1500);
    };

    const variables = activeEnvironment?.variables || [];

    const popover = isOpen && createPortal(
        <div
            id="env-quicklook-portal"
            className="env-quicklook-popover"
            style={{
                position: "fixed",
                top: menuPos.top,
                left: menuPos.left,
                zIndex: 99999,
            }}
            role="dialog"
            aria-label="Environment Quick Look"
        >
            {/* Header */}
            <div className="quicklook-header">
                <div className="quicklook-title-wrap">
                    <span className="quicklook-title">Environment Quick Look</span>
                    {activeEnvironment && (
                        <span className="quicklook-env-badge">{activeEnvironment.name}</span>
                    )}
                </div>
                <div className="quicklook-header-actions">
                    {activeEnvironment && onEditEnvironment && (
                        <button
                            type="button"
                            className="quicklook-edit-btn"
                            onClick={() => {
                                setIsOpen(false);
                                onEditEnvironment(activeEnvironment);
                            }}
                            title="Edit environment"
                        >
                            <MaterialIcon size={14}>edit</MaterialIcon>
                            <span>Edit</span>
                        </button>
                    )}
                    <button
                        type="button"
                        className="icon-button quicklook-close-btn"
                        onClick={() => setIsOpen(false)}
                        title="Close"
                        aria-label="Close Quick Look"
                    >
                        <MaterialIcon size={16}>close</MaterialIcon>
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="quicklook-body">
                {!activeEnvironment ? (
                    <div className="quicklook-empty">
                        <span className="quicklook-empty-icon">🌐</span>
                        <h4>No Environment Active</h4>
                        <p>
                            Select an environment to view its variables, or create a new environment
                            to use <code>{"{{variableName}}"}</code> placeholders in your requests.
                        </p>
                        {onCreateEnvironment && (
                            <button
                                type="button"
                                className="btn-quicklook-create"
                                onClick={() => {
                                    setIsOpen(false);
                                    onCreateEnvironment();
                                }}
                            >
                                <MaterialIcon size={16}>add</MaterialIcon>
                                <span>Create Environment</span>
                            </button>
                        )}
                    </div>
                ) : variables.filter((v) => v.enabled !== false).length === 0 ? (
                    <div className="quicklook-empty">
                        <span className="quicklook-empty-icon">📝</span>
                        <h4>No Active Variables</h4>
                        <p>This environment has no enabled variables yet.</p>
                        {onEditEnvironment && (
                            <button
                                type="button"
                                className="btn-quicklook-create"
                                onClick={() => {
                                    setIsOpen(false);
                                    onEditEnvironment(activeEnvironment);
                                }}
                            >
                                <MaterialIcon size={16}>add</MaterialIcon>
                                <span>Add Variables</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="quicklook-table-wrap">
                        <table className="quicklook-table">
                            <thead>
                                <tr>
                                    <th>Variable</th>
                                    <th>Type</th>
                                    <th>Value</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {variables.map((item, idx) => {
                                    if (item.enabled === false) return null;
                                    const isSecret = item.type === "secret";
                                    const isRevealed = Boolean(revealedSecrets[item.key]);
                                    const displayValue = isSecret && !isRevealed
                                        ? "••••••••"
                                        : item.value || <span className="empty-val">(empty)</span>;

                                    return (
                                        <tr key={idx}>
                                            <td className="var-col-name">
                                                <code>{`{{${item.key}}}`}</code>
                                            </td>
                                            <td className="var-col-type">
                                                <span className={`var-type-pill type-${item.type}`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="var-col-val" title={isRevealed ? item.value : undefined}>
                                                <span className="var-val-text">{displayValue}</span>
                                            </td>
                                            <td className="var-col-actions">
                                                {isSecret && (
                                                    <button
                                                        type="button"
                                                        className="quicklook-row-btn"
                                                        onClick={() => toggleSecret(item.key)}
                                                        title={isRevealed ? "Mask secret" : "Reveal secret"}
                                                    >
                                                        <MaterialIcon size={14}>
                                                            {isRevealed ? "visibility_off" : "visibility"}
                                                        </MaterialIcon>
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="quicklook-row-btn"
                                                    onClick={() => copyValue(item.key, item.value)}
                                                    title={copiedKey === item.key ? "Copied!" : "Copy value"}
                                                >
                                                    <MaterialIcon size={14}>
                                                        {copiedKey === item.key ? "check" : "content_copy"}
                                                    </MaterialIcon>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Footer */}
            {activeEnvironment && (
                <div className="quicklook-footer">
                    <span className="quicklook-hint">
                        Variables are automatically substituted when sending requests.
                    </span>
                </div>
            )}
        </div>,
        document.body
    );

    return (
        <div className="env-quicklook-anchor">
            <button
                ref={btnRef}
                type="button"
                className={`icon-button env-quicklook-trigger-btn ${isOpen ? "active" : ""}`}
                onClick={() => isOpen ? setIsOpen(false) : openPopover()}
                title={
                    activeEnvironment
                        ? `Quick Look: ${activeEnvironment.name}`
                        : "Environment Quick Look (no environment selected)"
                }
                aria-label="Environment Quick Look"
                aria-expanded={isOpen}
            >
                <MaterialIcon size={18}>visibility</MaterialIcon>
            </button>
            {popover}
        </div>
    );
}
