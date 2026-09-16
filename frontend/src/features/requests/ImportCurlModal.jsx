import React, { useState, useMemo, useEffect } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { parseCurlCommand } from "./curl-parser.js";

const SAMPLE_CURL = `curl --location 'https://jsonplaceholder.typicode.com/posts' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: Bearer my-sample-jwt-token' \\
--data '{
    "title": "foo",
    "body": "bar",
    "userId": 1
}'`;

export function ImportCurlModal({ isOpen, onClose, onImport }) {
    const [rawCurl, setRawCurl] = useState("");
    const [error, setError] = useState("");

    // Live parsing preview
    const parsedPreview = useMemo(() => {
        if (!rawCurl.trim()) {
            return null;
        }
        try {
            const parsed = parseCurlCommand(rawCurl);
            return { parsed, error: null };
        } catch (err) {
            return { parsed: null, error: err.message };
        }
    }, [rawCurl]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Clear state on open
    useEffect(() => {
        if (isOpen) {
            setRawCurl("");
            setError("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleImportSubmit = (e) => {
        e?.preventDefault();
        if (!rawCurl.trim()) {
            setError("Please paste or type a cURL command.");
            return;
        }

        try {
            const parsed = parseCurlCommand(rawCurl);
            onImport(parsed);
            onClose();
        } catch (err) {
            setError(err.message || "Failed to parse cURL command.");
        }
    };

    const handleLoadSample = () => {
        setRawCurl(SAMPLE_CURL);
        setError("");
    };

    const isReady = Boolean(parsedPreview?.parsed);

    return (
        <div className="modal-backdrop curl-import-modal-backdrop" onClick={onClose}>
            <div
                className="modal-content curl-import-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Import cURL Command"
            >
                {/* Header */}
                <div className="curl-import-header">
                    <div className="header-left">
                        <span className="import-icon-badge">
                            <MaterialIcon size={20}>input</MaterialIcon>
                        </span>
                        <div>
                            <h3 className="modal-title">Import cURL Command</h3>
                            <p className="modal-subtitle">Paste a cURL command to populate the Request Builder</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn-modal-close"
                        onClick={onClose}
                        title="Close (Esc)"
                        aria-label="Close modal"
                    >
                        <MaterialIcon size={18}>close</MaterialIcon>
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleImportSubmit} className="curl-import-form">
                    <div className="curl-input-section">
                        <div className="curl-textarea-header">
                            <label htmlFor="curl-command-input" className="section-label">
                                Paste cURL Command
                            </label>
                            <button
                                type="button"
                                className="btn-load-sample"
                                onClick={handleLoadSample}
                                title="Fill with an example cURL command"
                            >
                                <MaterialIcon size={14}>auto_fix_high</MaterialIcon>
                                <span>Paste Example</span>
                            </button>
                        </div>

                        <textarea
                            id="curl-command-input"
                            className="curl-textarea"
                            rows={7}
                            placeholder="curl --location 'https://api.example.com/data' \
  --header 'Authorization: Bearer token' \
  --data '{\&quot;key\&quot;: \&quot;value\&quot;}'"
                            value={rawCurl}
                            onChange={(e) => {
                                setRawCurl(e.target.value);
                                setError("");
                            }}
                            autoFocus
                            spellCheck={false}
                        />
                    </div>

                    {/* Validation Error Banner */}
                    {(error || (rawCurl.trim() && parsedPreview?.error)) && (
                        <div className="curl-error-banner" role="alert">
                            <MaterialIcon size={16}>error_outline</MaterialIcon>
                            <span>{error || parsedPreview?.error}</span>
                        </div>
                    )}

                    {/* Live Preview Card */}
                    {parsedPreview?.parsed && (
                        <div className="curl-preview-card">
                            <div className="preview-card-header">
                                <span className="preview-label">Parsed Request Preview</span>
                                <span className="preview-status-badge">
                                    <MaterialIcon size={14}>check_circle</MaterialIcon>
                                    <span>Ready to Import</span>
                                </span>
                            </div>

                            <div className="preview-details-grid">
                                <div className="preview-row">
                                    <span className="detail-label">Endpoint</span>
                                    <div className="detail-value-group">
                                        <span className={`method-badge method-badge-${parsedPreview.parsed.method.toLowerCase()}`}>
                                            {parsedPreview.parsed.method}
                                        </span>
                                        <code className="preview-url" title={parsedPreview.parsed.url}>
                                            {parsedPreview.parsed.url}
                                        </code>
                                    </div>
                                </div>

                                <div className="preview-badges-row">
                                    <span className="preview-tag" title="Parsed query parameters">
                                        <MaterialIcon size={13}>tune</MaterialIcon>
                                        <span>
                                            {parsedPreview.parsed.queryParams.filter((p) => p.enabled && p.key).length} Query Params
                                        </span>
                                    </span>

                                    <span className="preview-tag" title="Parsed headers">
                                        <MaterialIcon size={13}>view_list</MaterialIcon>
                                        <span>
                                            {parsedPreview.parsed.headers.filter((h) => h.enabled && h.key).length} Headers
                                        </span>
                                    </span>

                                    <span className={`preview-tag ${parsedPreview.parsed.auth.type !== "none" ? "auth-tag-active" : ""}`} title="Detected authentication">
                                        <MaterialIcon size={13}>lock</MaterialIcon>
                                        <span>
                                            Auth: {parsedPreview.parsed.auth.type === "none" ? "None" : parsedPreview.parsed.auth.type.toUpperCase()}
                                        </span>
                                    </span>

                                    {parsedPreview.parsed.bodyType !== "none" && (
                                        <span className="preview-tag body-tag" title="Payload type">
                                            <MaterialIcon size={13}>code</MaterialIcon>
                                            <span>Body: {parsedPreview.parsed.bodyType.toUpperCase()}</span>
                                        </span>
                                    )}
                                </div>

                                {parsedPreview.parsed.bodyContent && (
                                    <div className="preview-body-snippet">
                                        <div className="body-snippet-header">Payload Preview</div>
                                        <pre><code>{parsedPreview.parsed.bodyContent.slice(0, 220)}{parsedPreview.parsed.bodyContent.length > 220 ? "..." : ""}</code></pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="curl-import-footer">
                        <button type="button" className="btn-modal-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-import-confirm"
                            disabled={!isReady}
                        >
                            <MaterialIcon size={16}>download</MaterialIcon>
                            <span>Import to Request Builder</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
