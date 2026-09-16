import React, { useState, useMemo, useEffect, useRef } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import {
    SUPPORTED_LANGUAGES,
    generateSnippet,
    highlightCode,
} from "./snippet-generator.js";
import { buildVariablesMap } from "../environments/variable-resolver.js";

export function CodeSnippetModal({
    isOpen,
    onClose,
    requestConfig,
    activeEnvironment,
}) {
    const [selectedLanguage, setSelectedLanguage] = useState("curl");
    const [resolveVariables, setResolveVariables] = useState(true);
    const [maskSecrets, setMaskSecrets] = useState(false);
    const [copied, setCopied] = useState(false);
    const codeAreaRef = useRef(null);
    const gutterRef = useRef(null);

    // Build variables map from active environment
    const variablesMap = useMemo(() => {
        return buildVariablesMap(activeEnvironment?.variables || []);
    }, [activeEnvironment]);

    // Generate snippet reactively
    const snippetCode = useMemo(() => {
        if (!isOpen) return "";
        return generateSnippet(selectedLanguage, requestConfig, {
            resolveVariables,
            variablesMap,
            maskSecrets,
        });
    }, [isOpen, selectedLanguage, requestConfig, resolveVariables, variablesMap, maskSecrets]);

    // Active language metadata
    const activeLangMeta = useMemo(() => {
        return (
            SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguage) ||
            SUPPORTED_LANGUAGES[0]
        );
    }, [selectedLanguage]);

    // Syntax highlighted HTML
    const highlightedHtml = useMemo(() => {
        return highlightCode(snippetCode, activeLangMeta.mode);
    }, [snippetCode, activeLangMeta]);

    // Line numbers array
    const lineCount = useMemo(() => {
        if (!snippetCode) return 1;
        return snippetCode.split("\n").length;
    }, [snippetCode]);

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

    // Synchronize scroll between gutter and code
    const handleScroll = (e) => {
        if (gutterRef.current) {
            gutterRef.current.scrollTop = e.target.scrollTop;
        }
    };

    // Copy to clipboard
    const handleCopy = async () => {
        if (!snippetCode) return;
        try {
            await navigator.clipboard.writeText(snippetCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy code snippet:", err);
        }
    };

    if (!isOpen) return null;

    const hasUrl = Boolean(requestConfig?.url?.trim());

    return (
        <div className="modal-backdrop code-snippet-modal-backdrop" onClick={onClose}>
            <div
                className="modal-content code-snippet-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Generate Code Snippet"
            >
                {/* Modal Header */}
                <div className="code-snippet-modal-header">
                    <div className="header-left">
                        <span className="code-icon-badge">
                            <MaterialIcon size={18}>code</MaterialIcon>
                        </span>
                        <div className="header-title-block">
                            <h3 className="code-modal-title">Code Snippet</h3>
                            <span className="code-modal-subtitle">
                                <strong className={`method-pill method-${(requestConfig?.method || "GET").toLowerCase()}`}>
                                    {requestConfig?.method || "GET"}
                                </strong>
                                <span className="modal-target-url" title={requestConfig?.url}>
                                    {requestConfig?.url || "http://localhost:8000/api/v1/health"}
                                </span>
                            </span>
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

                {/* Toolbar */}
                <div className="code-snippet-toolbar">
                    <div className="toolbar-controls-left">
                        {/* Language Selector */}
                        <div className="language-selector-group">
                            <label htmlFor="code-language-select" className="control-label">
                                Language:
                            </label>
                            <select
                                id="code-language-select"
                                className="code-language-select"
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                            >
                                {SUPPORTED_LANGUAGES.map((lang) => (
                                    <option key={lang.id} value={lang.id}>
                                        {lang.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Toggles */}
                        <div className="snippet-options-group">
                            <label className="snippet-checkbox-label" title="Substitute active environment variables into the snippet">
                                <input
                                    type="checkbox"
                                    checked={resolveVariables}
                                    onChange={(e) => setResolveVariables(e.target.checked)}
                                />
                                <span>Resolve variables</span>
                                {activeEnvironment && (
                                    <span className="active-env-badge" title={`Active: ${activeEnvironment.name}`}>
                                        ({activeEnvironment.name})
                                    </span>
                                )}
                            </label>

                            <label className="snippet-checkbox-label" title="Hide Bearer tokens, passwords, and API key values">
                                <input
                                    type="checkbox"
                                    checked={maskSecrets}
                                    onChange={(e) => setMaskSecrets(e.target.checked)}
                                />
                                <span>Mask secrets</span>
                            </label>
                        </div>
                    </div>

                    <div className="toolbar-controls-right">
                        <button
                            type="button"
                            className={`btn-copy-code ${copied ? "is-copied" : ""}`}
                            onClick={handleCopy}
                            title="Copy code to clipboard"
                        >
                            <MaterialIcon size={16}>{copied ? "check" : "content_copy"}</MaterialIcon>
                            <span>{copied ? "Copied!" : "Copy Code"}</span>
                        </button>
                    </div>
                </div>

                {/* Code Viewer Area */}
                <div className="code-snippet-body">
                    {!hasUrl ? (
                        <div className="code-snippet-empty">
                            <MaterialIcon size={36}>link_off</MaterialIcon>
                            <p>Please enter a request URL in the Request Builder to generate code snippets.</p>
                        </div>
                    ) : (
                        <div className="code-snippet-viewer-container">
                            {/* Line Numbers Gutter */}
                            <div className="code-gutter" ref={gutterRef} aria-hidden="true">
                                {Array.from({ length: lineCount }, (_, i) => (
                                    <div key={i + 1} className="gutter-line-number">
                                        {i + 1}
                                    </div>
                                ))}
                            </div>

                            {/* Syntax Highlighted Code */}
                            <pre
                                className="code-snippet-pre"
                                ref={codeAreaRef}
                                onScroll={handleScroll}
                                tabIndex={0}
                            >
                                <code
                                    className={`code-snippet-code lang-${activeLangMeta.mode}`}
                                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                                />
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer info bar */}
                <div className="code-snippet-footer">
                    <span className="footer-tip">
                        <MaterialIcon size={14}>info</MaterialIcon>
                        <span>Snippets automatically update in real-time as you modify request headers, parameters, authentication, and body.</span>
                    </span>
                    <button type="button" className="btn-secondary btn-footer-close" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
