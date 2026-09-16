import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { detectContentType, formatBody } from "./response-formatter.js";
import { CollapsibleJsonViewer } from "./CollapsibleJsonViewer.jsx";

export function ResponseViewer({ response, loading, error, height = 440, onHeightChange, isDragging = false }) {
    const [tab, setTab] = useState("body");
    const [viewMode, setViewMode] = useState("pretty"); // "pretty" | "raw" | "preview"
    const [selectedFormat, setSelectedFormat] = useState("auto"); // "auto" | "json" | "xml" | "html" | "text"
    const [searchQuery, setSearchQuery] = useState("");
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
    const [matchCase, setMatchCase] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copiedHeaderKey, setCopiedHeaderKey] = useState(null);

    // Expand / Collapse All triggers for JSON viewer
    const [expandAllTrigger, setExpandAllTrigger] = useState(0);
    const [collapseAllTrigger, setCollapseAllTrigger] = useState(0);

    const codeContainerRef = useRef(null);
    const searchInputRef = useRef(null);

    // Normalize response body as string
    const rawBodyString = useMemo(() => {
        if (!response?.body) return "";
        if (typeof response.body === "string") return response.body;
        try {
            return JSON.stringify(response.body, null, 2);
        } catch {
            return String(response.body);
        }
    }, [response?.body]);

    // Detect format from headers and content
    const detectedFormat = useMemo(() => {
        return detectContentType(response?.headers, rawBodyString);
    }, [response?.headers, rawBodyString]);

    const activeFormat = selectedFormat === "auto" ? detectedFormat : selectedFormat;

    // Reset viewMode to pretty if preview is selected but format is not html
    useEffect(() => {
        if (viewMode === "preview" && activeFormat !== "html") {
            setViewMode("pretty");
        }
    }, [viewMode, activeFormat]);

    // Parse JSON if format is json
    const parsedJson = useMemo(() => {
        if (!rawBodyString) return null;
        try {
            return JSON.parse(rawBodyString);
        } catch {
            return null;
        }
    }, [rawBodyString]);

    // Formatted pretty body (JSON / XML / HTML / Text)
    const formattedBody = useMemo(() => {
        if (!rawBodyString) return "";
        if (viewMode === "raw") return rawBodyString;
        return formatBody(rawBodyString, activeFormat);
    }, [rawBodyString, viewMode, activeFormat]);

    // Split into lines for line number gutter
    const bodyLines = useMemo(() => {
        if (!formattedBody) return [];
        return formattedBody.split("\n");
    }, [formattedBody]);

    // Status category calculation
    const statusCategory = useMemo(() => {
        if (!response?.status) return "unknown";
        const code = response.status;
        if (code >= 200 && code < 300) return "2xx";
        if (code >= 300 && code < 400) return "3xx";
        if (code >= 400 && code < 500) return "4xx";
        if (code >= 500) return "5xx";
        return "other";
    }, [response?.status]);

    const formatBytes = (bytes) => {
        if (!bytes) return "0 B";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const headersList = useMemo(() => Object.entries(response?.headers || {}), [response?.headers]);

    // Filter headers when on headers tab
    const filteredHeaders = useMemo(() => {
        if (!searchQuery.trim()) return headersList;
        const q = matchCase ? searchQuery : searchQuery.toLowerCase();
        return headersList.filter(([key, val]) => {
            const k = matchCase ? key : key.toLowerCase();
            const v = matchCase ? String(val) : String(val).toLowerCase();
            return k.includes(q) || v.includes(q);
        });
    }, [headersList, searchQuery, matchCase]);

    // Compute split parts and match count for body search
    const { parts, totalMatches } = useMemo(() => {
        if (!formattedBody || !searchQuery.trim() || viewMode === "preview") {
            return { parts: null, totalMatches: 0 };
        }

        try {
            const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(`(${escaped})`, matchCase ? "g" : "gi");
            const splitParts = formattedBody.split(regex);
            const count = Math.floor(splitParts.length / 2);
            return { parts: splitParts, totalMatches: count };
        } catch {
            return { parts: null, totalMatches: 0 };
        }
    }, [formattedBody, searchQuery, matchCase, viewMode]);

    // Dedicated smooth scroll function that only scrolls code container without moving the outer page
    const scrollToMatch = useCallback((index) => {
        const container = codeContainerRef.current;
        if (!container) return;

        const matchEl = container.querySelector(`[data-match-idx="${index}"]`);
        if (!matchEl) return;

        const containerRect = container.getBoundingClientRect();
        const matchRect = matchEl.getBoundingClientRect();

        const targetTop =
            container.scrollTop +
            (matchRect.top - containerRect.top) -
            container.clientHeight / 2 +
            matchRect.height / 2;

        const targetLeft =
            container.scrollLeft +
            (matchRect.left - containerRect.left) -
            container.clientWidth / 2 +
            matchRect.width / 2;

        container.scrollTo({
            top: Math.max(0, targetTop),
            left: Math.max(0, targetLeft),
            behavior: "smooth",
        });
    }, []);

    // Navigate to next match
    const handleNextMatch = useCallback(() => {
        if (totalMatches <= 0) return;
        if (totalMatches === 1) {
            scrollToMatch(0);
            return;
        }
        const nextIdx = (currentMatchIndex + 1) % totalMatches;
        setCurrentMatchIndex(nextIdx);
        scrollToMatch(nextIdx);
    }, [currentMatchIndex, totalMatches, scrollToMatch]);

    // Navigate to previous match
    const handlePrevMatch = useCallback(() => {
        if (totalMatches <= 0) return;
        if (totalMatches === 1) {
            scrollToMatch(0);
            return;
        }
        const prevIdx = (currentMatchIndex - 1 + totalMatches) % totalMatches;
        setCurrentMatchIndex(prevIdx);
        scrollToMatch(prevIdx);
    }, [currentMatchIndex, totalMatches, scrollToMatch]);

    // Handle Enter / Shift+Enter / Esc in search input
    const handleSearchKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (totalMatches <= 0) return;
            if (e.shiftKey) {
                handlePrevMatch();
            } else {
                handleNextMatch();
            }
        } else if (e.key === "Escape") {
            setSearchQuery("");
            setCurrentMatchIndex(0);
            searchInputRef.current?.blur();
        }
    };

    // Auto-scroll on match change
    useEffect(() => {
        if (!searchQuery.trim() || totalMatches === 0) return;
        const raf = requestAnimationFrame(() => {
            scrollToMatch(currentMatchIndex);
        });
        return () => cancelAnimationFrame(raf);
    }, [currentMatchIndex, searchQuery, totalMatches, scrollToMatch]);

    // Intercept Cmd+F / Ctrl+F to focus the response search input
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && (e.key === "f" || e.key === "F")) {
                const target = e.target;
                const isFormInput =
                    target &&
                    (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
                    target !== searchInputRef.current;

                const isInsideResponse = target && target.closest?.(".response-panel");

                if (!isFormInput || isInsideResponse) {
                    e.preventDefault();
                    searchInputRef.current?.focus();
                    searchInputRef.current?.select();

                    const selection = window.getSelection()?.toString()?.trim();
                    if (selection && selection.length > 0 && selection.length < 80) {
                        setSearchQuery(selection);
                        setCurrentMatchIndex(0);
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Copy handler (copies body or headers JSON)
    const handleCopy = () => {
        if (tab === "body") {
            if (!rawBodyString) return;
            navigator.clipboard.writeText(rawBodyString);
        } else {
            navigator.clipboard.writeText(JSON.stringify(response?.headers || {}, null, 2));
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Copy individual header value
    const handleCopyHeaderValue = (key, val) => {
        navigator.clipboard.writeText(String(val));
        setCopiedHeaderKey(key);
        setTimeout(() => setCopiedHeaderKey(null), 1500);
    };

    // Download response as file
    const handleDownload = () => {
        if (!rawBodyString) return;
        let ext = "txt";
        let mime = "text/plain";
        if (activeFormat === "json") {
            ext = "json";
            mime = "application/json";
        } else if (activeFormat === "xml") {
            ext = "xml";
            mime = "application/xml";
        } else if (activeFormat === "html") {
            ext = "html";
            mime = "text/html";
        }

        const blob = new Blob([rawBodyString], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `response.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Render body with deterministic odd-index match highlighting
    const renderedTextBody = useMemo(() => {
        if (!formattedBody) return null;
        if (!parts || totalMatches === 0) {
            return <code>{formattedBody}</code>;
        }

        let matchCounter = 0;
        return (
            <code>
                {parts.map((part, index) => {
                    if (index % 2 === 1) {
                        const isCurrent = matchCounter === currentMatchIndex;
                        const matchId = matchCounter;
                        matchCounter++;
                        return (
                            <mark
                                key={`match-${index}`}
                                data-match-idx={matchId}
                                className={`search-highlight ${isCurrent ? "is-current-match" : ""}`}
                            >
                                {part}
                            </mark>
                        );
                    }
                    return part;
                })}
            </code>
        );
    }, [formattedBody, parts, totalMatches, currentMatchIndex]);

    // Helper to highlight matches inside header keys and values
    const renderHighlightedHeader = (text, query) => {
        if (!query.trim() || !text) return text;
        try {
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(`(${escaped})`, matchCase ? "g" : "gi");
            const headerParts = String(text).split(regex);
            return headerParts.map((part, i) =>
                i % 2 === 1 ? (
                    <mark key={i} className="search-highlight is-current-match">
                        {part}
                    </mark>
                ) : (
                    part
                )
            );
        } catch {
            return text;
        }
    };

    const isLargeResponse = (response?.sizeBytes || 0) > 1024 * 1024; // > 1 MB

    if (loading) {
        return (
            <div className="response-panel response-loading" style={{ height: `${height}px` }}>
                <div className="response-spinner-large" />
                <h3>Sending Request...</h3>
                <p>Waiting for target server response</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="response-panel response-error" role="alert" style={{ height: `${height}px` }}>
                <MaterialIcon size={32}>error_outline</MaterialIcon>
                <h3>Request Failed</h3>
                <p>{error}</p>
            </div>
        );
    }

    if (!response) {
        return (
            <div className="response-panel response-empty" style={{ height: `${height}px` }}>
                <div className="empty-graphic">
                    <MaterialIcon size={44}>send</MaterialIcon>
                </div>
                <h3>Response</h3>
                <p>Enter a URL and click <strong>Send</strong> to dispatch the request and inspect the response here.</p>
            </div>
        );
    }

    const useCollapsibleJson =
        tab === "body" &&
        viewMode === "pretty" &&
        activeFormat === "json" &&
        parsedJson !== null &&
        !isLargeResponse;

    return (
        <div
            className={`response-panel response-success ${isDragging ? "is-resizing" : ""}`}
            style={{ height: `${height}px` }}
        >
            {/* Top metadata and tabs bar */}
            <div className="response-header-bar">
                <div className="response-tabs">
                    <button
                        type="button"
                        className={`response-tab-btn ${tab === "body" ? "is-active" : ""}`}
                        onClick={() => setTab("body")}
                    >
                        Body
                    </button>
                    <button
                        type="button"
                        className={`response-tab-btn ${tab === "headers" ? "is-active" : ""}`}
                        onClick={() => setTab("headers")}
                    >
                        Headers ({headersList.length})
                    </button>
                </div>

                <div className="response-meta-stats">
                    <span className={`status-pill status-${statusCategory}`}>
                        <strong>{response.status}</strong> {response.statusText}
                    </span>
                    <span className="meta-stat" title="Roundtrip latency">
                        <MaterialIcon size={15}>timer</MaterialIcon>
                        <span>{response.timeMs} ms</span>
                    </span>
                    <span className="meta-stat" title="Payload size">
                        <MaterialIcon size={15}>tune</MaterialIcon>
                        <span>{formatBytes(response.sizeBytes)}</span>
                    </span>

                    <div className="response-size-presets" title="Adjust response height">
                        <span className="preset-label">Size:</span>
                        <button
                            type="button"
                            className={`btn-size-preset ${height <= 300 ? "is-active" : ""}`}
                            onClick={() => {
                                onHeightChange?.(280);
                                localStorage.setItem("postman-response-height", "280");
                            }}
                            title="Compact height (280px)"
                        >
                            S
                        </button>
                        <button
                            type="button"
                            className={`btn-size-preset ${height > 300 && height <= 520 ? "is-active" : ""}`}
                            onClick={() => {
                                onHeightChange?.(440);
                                localStorage.setItem("postman-response-height", "440");
                            }}
                            title="Default medium height (440px)"
                        >
                            M
                        </button>
                        <button
                            type="button"
                            className={`btn-size-preset ${height > 520 && height < 750 ? "is-active" : ""}`}
                            onClick={() => {
                                onHeightChange?.(680);
                                localStorage.setItem("postman-response-height", "680");
                            }}
                            title="Large height (680px)"
                        >
                            L
                        </button>
                        <button
                            type="button"
                            className={`btn-size-preset btn-fullscreen-preset ${height >= 750 ? "is-active" : ""}`}
                            onClick={() => {
                                const targetH = height >= 750 ? 440 : Math.max(780, window.innerHeight - 150);
                                onHeightChange?.(targetH);
                                localStorage.setItem("postman-response-height", String(targetH));
                            }}
                            title={height >= 750 ? "Restore medium height" : "Maximize response view"}
                        >
                            <MaterialIcon size={14}>{height >= 750 ? "fullscreen_exit" : "fullscreen"}</MaterialIcon>
                        </button>
                    </div>
                </div>
            </div>

            {/* Persistent Toolbar across tabs */}
            <div className="response-toolbar">
                <div className="toolbar-left">
                    {tab === "body" && (
                        <>
                            <div className="view-mode-toggle">
                                <button
                                    type="button"
                                    className={`mode-btn ${viewMode === "pretty" ? "is-active" : ""}`}
                                    onClick={() => setViewMode("pretty")}
                                >
                                    Pretty
                                </button>
                                <button
                                    type="button"
                                    className={`mode-btn ${viewMode === "raw" ? "is-active" : ""}`}
                                    onClick={() => setViewMode("raw")}
                                >
                                    Raw
                                </button>
                                {(activeFormat === "html" || rawBodyString.toLowerCase().includes("<html")) && (
                                    <button
                                        type="button"
                                        className={`mode-btn ${viewMode === "preview" ? "is-active" : ""}`}
                                        onClick={() => setViewMode("preview")}
                                    >
                                        Preview
                                    </button>
                                )}
                            </div>

                            {/* Format selector / detection pill */}
                            <div className="response-format-selector">
                                <select
                                    className="format-select"
                                    value={selectedFormat}
                                    onChange={(e) => setSelectedFormat(e.target.value)}
                                    title="Response format interpreter"
                                >
                                    <option value="auto">Auto ({detectedFormat.toUpperCase()})</option>
                                    <option value="json">JSON</option>
                                    <option value="xml">XML</option>
                                    <option value="html">HTML</option>
                                    <option value="text">Text</option>
                                </select>
                            </div>

                            {/* Expand All / Collapse All controls for JSON Pretty View */}
                            {useCollapsibleJson && (
                                <div className="json-expand-controls">
                                    <button
                                        type="button"
                                        className="btn-text-sm"
                                        onClick={() => setExpandAllTrigger(Date.now())}
                                        title="Expand all nodes"
                                    >
                                        <MaterialIcon size={14}>unfold_more</MaterialIcon>
                                        <span>Expand All</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-text-sm"
                                        onClick={() => setCollapseAllTrigger(Date.now())}
                                        title="Collapse all nodes"
                                    >
                                        <MaterialIcon size={14}>unfold_less</MaterialIcon>
                                        <span>Collapse All</span>
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="toolbar-actions-group">
                    <div className="search-in-response">
                        <MaterialIcon size={16}>search</MaterialIcon>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={tab === "body" ? "Search response body..." : "Search headers..."}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentMatchIndex(0);
                            }}
                            onKeyDown={handleSearchKeyDown}
                            aria-label="Search response"
                        />

                        {!searchQuery && (
                            <kbd className="search-shortcut-hint" title="Press ⌘F or Ctrl+F to search">
                                ⌘F
                            </kbd>
                        )}

                        {searchQuery.trim() && (
                            <span
                                className={`search-match-count ${
                                    tab === "body" && totalMatches === 0 ? "no-matches" : ""
                                }`}
                            >
                                {tab === "body" ? (
                                    totalMatches > 0 ? (
                                        `${currentMatchIndex + 1} of ${totalMatches}`
                                    ) : (
                                        "No matches"
                                    )
                                ) : filteredHeaders.length > 0 ? (
                                    `${filteredHeaders.length} of ${headersList.length}`
                                ) : (
                                    "No matches"
                                )}
                            </span>
                        )}

                        {tab === "body" && totalMatches > 0 && (
                            <div className="search-nav-buttons">
                                <button
                                    type="button"
                                    className="icon-button btn-search-nav"
                                    onClick={handlePrevMatch}
                                    title="Previous match (Shift+Enter)"
                                    aria-label="Previous match"
                                >
                                    <MaterialIcon size={16}>expand_less</MaterialIcon>
                                </button>
                                <button
                                    type="button"
                                    className="icon-button btn-search-nav"
                                    onClick={handleNextMatch}
                                    title="Next match (Enter)"
                                    aria-label="Next match"
                                >
                                    <MaterialIcon size={16}>expand_more</MaterialIcon>
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            className={`icon-button btn-case-toggle ${matchCase ? "is-active" : ""}`}
                            onClick={() => {
                                setMatchCase((prev) => !prev);
                                setCurrentMatchIndex(0);
                            }}
                            title="Match Case (Aa)"
                            aria-label="Toggle case sensitivity"
                        >
                            <span style={{ fontSize: "11px", fontWeight: 700, fontFamily: "monospace" }}>Aa</span>
                        </button>

                        {searchQuery && (
                            <button
                                type="button"
                                className="icon-button btn-clear-search"
                                onClick={() => {
                                    setSearchQuery("");
                                    setCurrentMatchIndex(0);
                                    searchInputRef.current?.focus();
                                }}
                                title="Clear search (Esc)"
                                aria-label="Clear search"
                            >
                                <MaterialIcon size={14}>close</MaterialIcon>
                            </button>
                        )}
                    </div>

                    <div className="toolbar-right">
                        <button
                            type="button"
                            className="btn-text btn-copy-response"
                            onClick={handleCopy}
                            title={tab === "body" ? "Copy response body" : "Copy headers JSON"}
                        >
                            <MaterialIcon size={16}>{copied ? "check" : "content_copy"}</MaterialIcon>
                            <span>{copied ? "Copied" : "Copy"}</span>
                        </button>
                        <button
                            type="button"
                            className="btn-text btn-download-response"
                            onClick={handleDownload}
                            title="Save response as a file"
                        >
                            <MaterialIcon size={16}>download</MaterialIcon>
                            <span>Download</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Large Response Warning Banner */}
            {isLargeResponse && tab === "body" && (
                <div className="response-large-warning">
                    <MaterialIcon size={16}>warning</MaterialIcon>
                    <span>
                        Large response ({formatBytes(response.sizeBytes)}). Collapsible rendering is disabled for performance. Use Raw view or Download to inspect the complete payload.
                    </span>
                </div>
            )}

            {/* Body Pane */}
            {tab === "body" && (
                <div className="response-body-pane">
                    {viewMode === "preview" ? (
                        <div className="response-html-preview-container">
                            <iframe
                                title="HTML Response Preview"
                                sandbox="allow-same-origin"
                                srcDoc={rawBodyString}
                                className="response-html-preview-frame"
                            />
                        </div>
                    ) : useCollapsibleJson ? (
                        <div className="response-code-container" ref={codeContainerRef}>
                            <CollapsibleJsonViewer
                                data={parsedJson}
                                searchQuery={searchQuery}
                                matchCase={matchCase}
                                expandAllTrigger={expandAllTrigger}
                                collapseAllTrigger={collapseAllTrigger}
                            />
                        </div>
                    ) : (
                        <div className="response-code-container with-gutter" ref={codeContainerRef}>
                            {/* Line Numbers Gutter */}
                            <div className="line-numbers-gutter" aria-hidden="true">
                                {bodyLines.map((_, i) => (
                                    <div key={i} className="line-number">
                                        {i + 1}
                                    </div>
                                ))}
                            </div>
                            <pre className="response-code-block">{renderedTextBody}</pre>
                        </div>
                    )}
                </div>
            )}

            {/* Headers Pane */}
            {tab === "headers" && (
                <div className="response-headers-pane">
                    {filteredHeaders.length === 0 ? (
                        <p className="no-headers-msg">
                            {searchQuery ? `No headers matching "${searchQuery}".` : "No response headers received."}
                        </p>
                    ) : (
                        <table className="headers-table">
                            <thead>
                                <tr>
                                    <th>Header</th>
                                    <th>Value</th>
                                    <th style={{ width: "48px" }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHeaders.map(([key, val]) => (
                                    <tr key={key} className="header-row">
                                        <td className="header-key">
                                            {renderHighlightedHeader(key, searchQuery)}
                                        </td>
                                        <td className="header-value">
                                            {renderHighlightedHeader(val, searchQuery)}
                                        </td>
                                        <td className="header-actions-cell">
                                            <button
                                                type="button"
                                                className="btn-header-copy"
                                                onClick={() => handleCopyHeaderValue(key, val)}
                                                title={copiedHeaderKey === key ? "Copied!" : "Copy header value"}
                                            >
                                                <MaterialIcon size={14}>
                                                    {copiedHeaderKey === key ? "check" : "content_copy"}
                                                </MaterialIcon>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
