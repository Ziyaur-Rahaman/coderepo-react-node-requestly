import React, { useState, useEffect, useCallback } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { historyApi } from "./history.api.js";
import { ConfirmModal } from "../../shared/components/ConfirmModal.jsx";

const METHOD_COLORS = {
    GET: "#10b981",
    POST: "#f59e0b",
    PUT: "#3b82f6",
    PATCH: "#8b5cf6",
    DELETE: "#ef4444",
    HEAD: "#06b6d4",
    OPTIONS: "#6b7280",
};

function formatRelativeTime(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 10) return "just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getGroupLabel(dateStr) {
    if (!dateStr) return "Older";
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const itemDate = new Date(date);
    itemDate.setHours(0, 0, 0, 0);

    if (itemDate.getTime() === today.getTime()) return "Today";
    if (itemDate.getTime() === yesterday.getTime()) return "Yesterday";
    return "Older";
}

function getStatusBadgeClass(status) {
    if (!status) return "status-badge-err";
    if (status >= 200 && status < 300) return "status-badge-2xx";
    if (status >= 300 && status < 400) return "status-badge-3xx";
    if (status >= 400 && status < 500) return "status-badge-4xx";
    return "status-badge-5xx";
}

export function HistoryList({
    activeHistoryId,
    onSelectHistory,
    onSaveToCollection,
    onSendAdhocHealthCheck,
    refreshTrigger,
}) {
    const [historyItems, setHistoryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [methodFilter, setMethodFilter] = useState("ALL");
    const [deletingId, setDeletingId] = useState(null);
    const [clearing, setClearing] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const loadHistory = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const response = await historyApi.list({
                search,
                method: methodFilter !== "ALL" ? methodFilter : "",
                limit: 100,
            });
            const items = Array.isArray(response) ? response : (response?.data || []);
            setHistoryItems(items);
        } catch (err) {
            setError(err.message || "Failed to load request history.");
        } finally {
            setLoading(false);
        }
    }, [search, methodFilter]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory, refreshTrigger]);

    const handleDeleteItem = async (e, id) => {
        e.stopPropagation();
        try {
            setDeletingId(id);
            await historyApi.remove(id);
            setHistoryItems((prev) => prev.filter((item) => item._id !== id));
        } catch (err) {
            alert(err.message || "Failed to delete history item.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleConfirmClearAll = async () => {
        try {
            setClearing(true);
            await historyApi.clearAll();
            setHistoryItems([]);
            setShowClearConfirm(false);
        } catch (err) {
            alert(err.message || "Failed to clear history.");
        } finally {
            setClearing(false);
        }
    };

    // Group items by Today, Yesterday, Older
    const groupedItems = historyItems.reduce((acc, item) => {
        const group = getGroupLabel(item.executedAt);
        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
    }, {});

    const groups = ["Today", "Yesterday", "Older"].filter((g) => groupedItems[g]?.length > 0);

    const methods = ["ALL", "GET", "POST", "PUT", "PATCH", "DELETE"];

    return (
        <div className="history-container">
            {/* Search and Filters */}
            <div className="history-search-bar">
                <MaterialIcon size={16}>search</MaterialIcon>
                <input
                    type="text"
                    placeholder="Search history by URL or name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search request history"
                />
                {search && (
                    <button
                        type="button"
                        className="icon-button"
                        onClick={() => setSearch("")}
                        title="Clear search"
                    >
                        <MaterialIcon size={14}>close</MaterialIcon>
                    </button>
                )}
            </div>

            {/* Method Filter Pills */}
            <div className="history-method-filter">
                {methods.map((m) => (
                    <button
                        key={m}
                        type="button"
                        className={`method-filter-pill ${methodFilter === m ? "active" : ""}`}
                        onClick={() => setMethodFilter(m)}
                    >
                        {m}
                    </button>
                ))}
            </div>

            {/* Header / Stats & Controls */}
            <div className="sidebar-section-header history-header">
                <span>HISTORY ({historyItems.length})</span>
                <div className="history-header-actions">
                    {historyItems.length > 0 && (
                        <button
                            type="button"
                            className="icon-button danger-hover"
                            onClick={() => setShowClearConfirm(true)}
                            disabled={clearing}
                            title="Clear all history"
                            aria-label="Clear all history"
                        >
                            <MaterialIcon size={16}>delete_sweep</MaterialIcon>
                        </button>
                    )}
                    <button
                        type="button"
                        className="icon-button"
                        onClick={loadHistory}
                        disabled={loading}
                        title="Refresh history"
                        aria-label="Refresh history"
                    >
                        <MaterialIcon size={15}>refresh</MaterialIcon>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="history-list-content">
                {loading && historyItems.length === 0 ? (
                    <div className="sidebar-loading">
                        <span className="spinner-small" />
                        <span>Loading history...</span>
                    </div>
                ) : error ? (
                    <div className="sidebar-error">
                        <span>{error}</span>
                        <button type="button" onClick={loadHistory}>
                            Retry
                        </button>
                    </div>
                ) : historyItems.length === 0 ? (
                    <div className="sidebar-empty-box">
                        <span className="empty-icon">🕒</span>
                        <p>{search || methodFilter !== "ALL" ? "No matching history" : "No request history yet"}</p>
                        <small className="empty-subtext">
                            {search || methodFilter !== "ALL"
                                ? "Try broadening your search or resetting filters."
                                : "Every request you send will be automatically logged here."}
                        </small>
                        {search || methodFilter !== "ALL" ? (
                            <button
                                type="button"
                                className="btn-empty-action"
                                onClick={() => {
                                    setSearch("");
                                    setMethodFilter("ALL");
                                }}
                            >
                                Reset Filters
                            </button>
                        ) : (
                            onSendAdhocHealthCheck && (
                                <button
                                    type="button"
                                    className="btn-empty-action"
                                    onClick={onSendAdhocHealthCheck}
                                >
                                    + Send Health Check
                                </button>
                            )
                        )}
                    </div>
                ) : (
                    <div className="history-groups">
                        {groups.map((group) => (
                            <div key={group} className="history-group">
                                <div className="history-group-title">{group}</div>
                                {groupedItems[group].map((item) => {
                                    const reqMethod = item.request?.method || "GET";
                                    const status = item.response?.status;
                                    const isSelected = activeHistoryId === item._id;

                                    return (
                                        <div
                                            key={item._id}
                                            className={`history-item-row ${isSelected ? "selected" : ""}`}
                                            onClick={() => onSelectHistory(item)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    onSelectHistory(item);
                                                }
                                            }}
                                            title={`Click to reload: ${reqMethod} ${item.request?.url}`}
                                        >
                                            <div className="history-item-top">
                                                <span
                                                    className="history-method-badge"
                                                    style={{ color: METHOD_COLORS[reqMethod] || "#fff" }}
                                                >
                                                    {reqMethod}
                                                </span>
                                                <span
                                                    className={`history-status-badge ${getStatusBadgeClass(status)}`}
                                                >
                                                    {status || "ERR"}
                                                </span>
                                                <span className="history-time-ago">
                                                    {formatRelativeTime(item.executedAt)}
                                                </span>
                                            </div>

                                            <div className="history-item-url" title={item.request?.url}>
                                                {item.name && item.name !== "Untitled Request"
                                                    ? item.name
                                                    : item.request?.url?.replace(/^https?:\/\//i, "") || "Untitled Request"}
                                            </div>

                                            <div className="history-item-bottom">
                                                <span className="history-meta-stat">
                                                    {item.response?.timeMs ? `${item.response.timeMs}ms` : "-"}
                                                </span>
                                                {item.response?.sizeBytes > 0 && (
                                                    <span className="history-meta-stat">
                                                        {(item.response.sizeBytes / 1024).toFixed(1)} KB
                                                    </span>
                                                )}

                                                <div className="history-item-actions">
                                                    {onSaveToCollection && (
                                                        <button
                                                            type="button"
                                                            className="history-action-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSaveToCollection(item);
                                                            }}
                                                            title="Save to Collection"
                                                            aria-label="Save to Collection"
                                                        >
                                                            <MaterialIcon size={14}>bookmark_add</MaterialIcon>
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="history-action-btn danger"
                                                        onClick={(e) => handleDeleteItem(e, item._id)}
                                                        disabled={deletingId === item._id}
                                                        title="Delete from history"
                                                        aria-label="Delete from history"
                                                    >
                                                        <MaterialIcon size={14}>delete</MaterialIcon>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* In-app Clear History Confirmation Modal */}
            <ConfirmModal
                open={showClearConfirm}
                title="Clear Request History"
                message="Are you sure you want to clear all request history? This action cannot be undone."
                confirmLabel="Clear All"
                confirmVariant="danger"
                loading={clearing}
                onConfirm={handleConfirmClearAll}
                onClose={() => setShowClearConfirm(false)}
            />
        </div>
    );
}
