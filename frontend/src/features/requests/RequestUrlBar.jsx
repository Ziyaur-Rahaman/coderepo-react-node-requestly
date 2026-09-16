import React, { useState, useRef, useEffect } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

const HTTP_METHODS = [
    { name: "GET", desc: "Retrieve data from server" },
    { name: "POST", desc: "Submit data / create new resource" },
    { name: "PUT", desc: "Replace entire resource" },
    { name: "PATCH", desc: "Apply partial modifications" },
    { name: "DELETE", desc: "Remove target resource" },
    { name: "HEAD", desc: "Retrieve headers without body" },
    { name: "OPTIONS", desc: "Check permitted HTTP methods" },
];

export function RequestUrlBar({
    method,
    onMethodChange,
    url,
    onUrlChange,
    onSend,
    onCancel,
    loading,
    onSave,
    isSaved,
    onOpenCode,
    onOpenImportCurl,
}) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                setDropdownOpen(false);
            }
        };
        if (dropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("keydown", handleKeyDown);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [dropdownOpen]);

    const handleInputKeyDown = (e) => {
        if (e.key === "Enter" && !loading) {
            e.preventDefault();
            onSend();
        }
    };

    const handleSelectMethod = (selectedMethod) => {
        onMethodChange(selectedMethod);
        setDropdownOpen(false);
    };

    return (
        <div className="request-url-bar">
            <div className="method-selector-custom" ref={dropdownRef}>
                <button
                    type="button"
                    className={`method-trigger-btn method-badge-${method.toLowerCase()} ${
                        dropdownOpen ? "is-active" : ""
                    }`}
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    aria-haspopup="listbox"
                    aria-expanded={dropdownOpen}
                    title="Change HTTP method"
                >
                    <span className="method-text">{method}</span>
                    <span className={`method-arrow ${dropdownOpen ? "is-open" : ""}`}>
                        <MaterialIcon size={16}>expand_more</MaterialIcon>
                    </span>
                </button>

                {dropdownOpen && (
                    <div className="method-dropdown-menu" role="listbox" tabIndex={-1}>
                        <div className="method-dropdown-title">Select HTTP Method</div>
                        <div className="method-options-list">
                            {HTTP_METHODS.map((item) => {
                                const isSelected = item.name === method;
                                return (
                                    <button
                                        key={item.name}
                                        type="button"
                                        className={`method-option-row ${isSelected ? "is-selected" : ""}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => handleSelectMethod(item.name)}
                                    >
                                        <span className={`method-chip method-badge-${item.name.toLowerCase()}`}>
                                            {item.name}
                                        </span>
                                        <span className="method-desc">{item.desc}</span>
                                        {isSelected && (
                                            <span className="method-check-icon">
                                                <MaterialIcon size={16}>check</MaterialIcon>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="url-input-wrapper">
                <input
                    type="text"
                    className="url-input"
                    value={url}
                    placeholder="Enter request URL or paste cURL (e.g. http://localhost:8000/api/v1/health)"
                    onChange={(e) => onUrlChange(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    aria-label="Request URL"
                    spellCheck="false"
                />
            </div>

            <div className="url-bar-actions">
                {loading ? (
                    <button
                        type="button"
                        className="btn-send is-loading"
                        onClick={onCancel}
                        title="Cancel request"
                    >
                        <span className="spinner-small" />
                        <span>Cancel</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        className="btn-send"
                        onClick={onSend}
                        disabled={!url.trim()}
                        title="Send request (Enter)"
                    >
                        <MaterialIcon size={18}>send</MaterialIcon>
                        <span>Send</span>
                    </button>
                )}

                <button
                    type="button"
                    className="btn-secondary btn-save"
                    onClick={onSave}
                    title="Save request to MongoDB"
                >
                    <MaterialIcon size={18}>save</MaterialIcon>
                    <span>{isSaved ? "Saved" : "Save"}</span>
                </button>

                <button
                    type="button"
                    className="btn-secondary btn-code-snippet-trigger"
                    onClick={onOpenCode}
                    title="Generate Code Snippet"
                >
                    <MaterialIcon size={18}>code</MaterialIcon>
                    <span>Code</span>
                </button>

                <button
                    type="button"
                    className="btn-secondary btn-curl-import-trigger"
                    onClick={onOpenImportCurl}
                    title="Import cURL command"
                >
                    <MaterialIcon size={18}>download</MaterialIcon>
                    <span>Import cURL</span>
                </button>
            </div>
        </div>
    );
}
