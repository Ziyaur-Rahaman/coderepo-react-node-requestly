import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

/**
 * Interactive Collapsible JSON Viewer with syntax highlighting and line numbers.
 */
export function CollapsibleJsonViewer({
    data,
    searchQuery = "",
    matchCase = false,
    expandAllTrigger = 0,
    collapseAllTrigger = 0,
}) {
    // Set of paths that are collapsed. If empty, everything is expanded.
    const [collapsedPaths, setCollapsedPaths] = useState(new Set());

    // Handle global Expand All
    useEffect(() => {
        if (expandAllTrigger > 0) {
            setCollapsedPaths(new Set());
        }
    }, [expandAllTrigger]);

    // Handle global Collapse All
    useEffect(() => {
        if (collapseAllTrigger > 0) {
            // Find all paths that contain objects or arrays
            const allExpandablePaths = new Set();
            const collect = (val, path) => {
                if (val && typeof val === "object") {
                    allExpandablePaths.add(path);
                    Object.entries(val).forEach(([k, v]) => {
                        collect(v, path ? `${path}.${k}` : k);
                    });
                }
            };
            collect(data, "root");
            setCollapsedPaths(allExpandablePaths);
        }
    }, [collapseAllTrigger, data]);

    const toggleCollapse = useCallback((path) => {
        setCollapsedPaths((prev) => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    // Text highlighting for search matches
    const highlightText = useCallback(
        (text, query) => {
            if (!query.trim() || text === undefined || text === null) {
                return text;
            }
            const str = String(text);
            try {
                const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const regex = new RegExp(`(${escaped})`, matchCase ? "g" : "gi");
                const parts = str.split(regex);
                if (parts.length === 1) return str;

                return parts.map((part, i) =>
                    i % 2 === 1 ? (
                        <mark key={i} className="search-highlight is-current-match">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                );
            } catch {
                return str;
            }
        },
        [matchCase]
    );

    // Recursive node renderer
    const renderValue = (value, path, depth = 0, isLast = true, keyName = null) => {
        const indentSpaces = "  ".repeat(depth);
        const isCollapsed = collapsedPaths.has(path);

        if (value === null) {
            return (
                <div key={path} className="json-line">
                    <span className="json-indent">{indentSpaces}</span>
                    {keyName !== null && (
                        <span className="json-key">
                            "{highlightText(keyName, searchQuery)}":{" "}
                        </span>
                    )}
                    <span className="json-null">{highlightText("null", searchQuery)}</span>
                    {!isLast && <span className="json-comma">,</span>}
                </div>
            );
        }

        if (typeof value === "boolean") {
            return (
                <div key={path} className="json-line">
                    <span className="json-indent">{indentSpaces}</span>
                    {keyName !== null && (
                        <span className="json-key">
                            "{highlightText(keyName, searchQuery)}":{" "}
                        </span>
                    )}
                    <span className="json-boolean">{highlightText(String(value), searchQuery)}</span>
                    {!isLast && <span className="json-comma">,</span>}
                </div>
            );
        }

        if (typeof value === "number") {
            return (
                <div key={path} className="json-line">
                    <span className="json-indent">{indentSpaces}</span>
                    {keyName !== null && (
                        <span className="json-key">
                            "{highlightText(keyName, searchQuery)}":{" "}
                        </span>
                    )}
                    <span className="json-number">{highlightText(String(value), searchQuery)}</span>
                    {!isLast && <span className="json-comma">,</span>}
                </div>
            );
        }

        if (typeof value === "string") {
            return (
                <div key={path} className="json-line">
                    <span className="json-indent">{indentSpaces}</span>
                    {keyName !== null && (
                        <span className="json-key">
                            "{highlightText(keyName, searchQuery)}":{" "}
                        </span>
                    )}
                    <span className="json-string">
                        "{highlightText(value, searchQuery)}"
                    </span>
                    {!isLast && <span className="json-comma">,</span>}
                </div>
            );
        }

        if (Array.isArray(value)) {
            const count = value.length;
            if (count === 0) {
                return (
                    <div key={path} className="json-line">
                        <span className="json-indent">{indentSpaces}</span>
                        {keyName !== null && (
                            <span className="json-key">
                                "{highlightText(keyName, searchQuery)}":{" "}
                            </span>
                        )}
                        <span className="json-bracket">[]</span>
                        {!isLast && <span className="json-comma">,</span>}
                    </div>
                );
            }

            return (
                <div key={path} className="json-block">
                    <div className="json-line json-block-header">
                        <span className="json-indent">{indentSpaces}</span>
                        <button
                            type="button"
                            className="json-fold-btn"
                            onClick={() => toggleCollapse(path)}
                            title={isCollapsed ? "Expand array" : "Collapse array"}
                            aria-label={isCollapsed ? "Expand" : "Collapse"}
                        >
                            <MaterialIcon size={13}>
                                {isCollapsed ? "arrow_right" : "arrow_drop_down"}
                            </MaterialIcon>
                        </button>
                        {keyName !== null && (
                            <span className="json-key">
                                "{highlightText(keyName, searchQuery)}":{" "}
                            </span>
                        )}
                        <span className="json-bracket">[</span>
                        {isCollapsed && (
                            <span
                                className="json-collapsed-badge"
                                onClick={() => toggleCollapse(path)}
                            >
                                {count} {count === 1 ? "item" : "items"}
                            </span>
                        )}
                        {isCollapsed && <span className="json-bracket">]</span>}
                        {isCollapsed && !isLast && <span className="json-comma">,</span>}
                    </div>

                    {!isCollapsed && (
                        <div className="json-block-body">
                            {value.map((item, idx) =>
                                renderValue(
                                    item,
                                    `${path}[${idx}]`,
                                    depth + 1,
                                    idx === count - 1,
                                    null
                                )
                            )}
                        </div>
                    )}

                    {!isCollapsed && (
                        <div className="json-line json-block-footer">
                            <span className="json-indent">{indentSpaces}</span>
                            <span className="json-bracket">]</span>
                            {!isLast && <span className="json-comma">,</span>}
                        </div>
                    )}
                </div>
            );
        }

        if (typeof value === "object") {
            const keys = Object.keys(value);
            const count = keys.length;
            if (count === 0) {
                return (
                    <div key={path} className="json-line">
                        <span className="json-indent">{indentSpaces}</span>
                        {keyName !== null && (
                            <span className="json-key">
                                "{highlightText(keyName, searchQuery)}":{" "}
                            </span>
                        )}
                        <span className="json-bracket">{"{}"}</span>
                        {!isLast && <span className="json-comma">,</span>}
                    </div>
                );
            }

            return (
                <div key={path} className="json-block">
                    <div className="json-line json-block-header">
                        <span className="json-indent">{indentSpaces}</span>
                        <button
                            type="button"
                            className="json-fold-btn"
                            onClick={() => toggleCollapse(path)}
                            title={isCollapsed ? "Expand object" : "Collapse object"}
                            aria-label={isCollapsed ? "Expand" : "Collapse"}
                        >
                            <MaterialIcon size={13}>
                                {isCollapsed ? "arrow_right" : "arrow_drop_down"}
                            </MaterialIcon>
                        </button>
                        {keyName !== null && (
                            <span className="json-key">
                                "{highlightText(keyName, searchQuery)}":{" "}
                            </span>
                        )}
                        <span className="json-bracket">{"{"}</span>
                        {isCollapsed && (
                            <span
                                className="json-collapsed-badge"
                                onClick={() => toggleCollapse(path)}
                            >
                                {count} {count === 1 ? "key" : "keys"}
                            </span>
                        )}
                        {isCollapsed && <span className="json-bracket">{"}"}</span>}
                        {isCollapsed && !isLast && <span className="json-comma">,</span>}
                    </div>

                    {!isCollapsed && (
                        <div className="json-block-body">
                            {keys.map((k, idx) =>
                                renderValue(
                                    value[k],
                                    `${path}.${k}`,
                                    depth + 1,
                                    idx === count - 1,
                                    k
                                )
                            )}
                        </div>
                    )}

                    {!isCollapsed && (
                        <div className="json-line json-block-footer">
                            <span className="json-indent">{indentSpaces}</span>
                            <span className="json-bracket">{"}"}</span>
                            {!isLast && <span className="json-comma">,</span>}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div key={path} className="json-line">
                <span className="json-indent">{indentSpaces}</span>
                <span>{highlightText(String(value), searchQuery)}</span>
            </div>
        );
    };

    return (
        <div className="collapsible-json-viewer">
            {renderValue(data, "root", 0, true, null)}
        </div>
    );
}
