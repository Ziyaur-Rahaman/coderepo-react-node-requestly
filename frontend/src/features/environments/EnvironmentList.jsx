import React, { useState, useMemo } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { ConfirmModal } from "../../shared/components/ConfirmModal.jsx";
import { ContextMenu } from "../../shared/components/ContextMenu.jsx";

export function EnvironmentList({
    environments = [],
    activeEnvironmentId,
    loading = false,
    error = "",
    onRefresh,
    onSelectEnvironment,
    onCreateEnvironment,
    onEditEnvironment,
    onDuplicateEnvironment,
    onDeleteEnvironment,
}) {
    const [search, setSearch] = useState("");
    const [contextMenu, setContextMenu] = useState(null); // { env, anchorEl }
    const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredEnvironments = useMemo(() => {
        if (!search.trim()) return environments;
        const query = search.toLowerCase();
        return environments.filter(
            (e) =>
                e.name.toLowerCase().includes(query) ||
                (e.description && e.description.toLowerCase().includes(query)) ||
                (e.variables || []).some((v) => v.key && v.key.toLowerCase().includes(query))
        );
    }, [environments, search]);

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await onDeleteEnvironment(deleteTarget.id);
            setDeleteTarget(null);
        } catch (err) {
            alert(err.message || "Failed to delete environment.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="sidebar-environments-panel">
            {/* Search Input */}
            <div className="sidebar-search">
                <MaterialIcon size={16}>search</MaterialIcon>
                <input
                    type="text"
                    placeholder="Search environments & variables..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search environments"
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

            {/* Header / Actions */}
            <div className="sidebar-section-header">
                <span className="section-title">
                    ENVIRONMENTS ({environments.length})
                </span>
                <div className="section-header-actions">
                    <button
                        type="button"
                        className="header-add-collection-btn"
                        onClick={onCreateEnvironment}
                        title="Create new environment"
                        aria-label="Create new environment"
                    >
                        <MaterialIcon size={16}>add</MaterialIcon>
                    </button>
                    {onRefresh && (
                        <button
                            type="button"
                            className="header-refresh-btn"
                            onClick={onRefresh}
                            title="Refresh environments"
                            aria-label="Refresh environments"
                        >
                            <MaterialIcon size={15}>refresh</MaterialIcon>
                        </button>
                    )}
                </div>
            </div>

            {/* Body */}
            {loading ? (
                <div className="sidebar-loading">
                    <span className="spinner-small" />
                    <span>Loading environments...</span>
                </div>
            ) : error ? (
                <div className="sidebar-error">
                    <span>{error}</span>
                    {onRefresh && (
                        <button type="button" onClick={onRefresh}>
                            Retry
                        </button>
                    )}
                </div>
            ) : environments.length === 0 ? (
                <div className="sidebar-empty-box">
                    <span className="empty-icon">🌐</span>
                    <p>No environments yet</p>
                    <button
                        type="button"
                        className="btn-empty-action"
                        onClick={onCreateEnvironment}
                    >
                        + Create Environment
                    </button>
                </div>
            ) : filteredEnvironments.length === 0 ? (
                <div className="sidebar-empty-box">
                    <span className="empty-icon">🔍</span>
                    <p>No matches for "{search}"</p>
                    <button
                        type="button"
                        className="btn-empty-action"
                        onClick={() => setSearch("")}
                    >
                        Clear Search
                    </button>
                </div>
            ) : (
                <div className="environments-list-container">
                    {filteredEnvironments.map((env) => {
                        const isActive = env._id === activeEnvironmentId;
                        const varCount = (env.variables || []).length;
                        const enabledCount = (env.variables || []).filter((v) => v.enabled !== false).length;

                        return (
                            <div
                                key={env._id}
                                className={`env-list-card ${isActive ? "active-env" : ""}`}
                                onClick={() => onSelectEnvironment(isActive ? null : env._id)}
                            >
                                <div className="env-card-left">
                                    <div
                                        className={`env-radio-check ${isActive ? "checked" : ""}`}
                                        title={isActive ? "Active environment (click to deactivate)" : "Click to activate"}
                                    >
                                        <MaterialIcon size={16}>
                                            {isActive ? "radio_button_checked" : "radio_button_unchecked"}
                                        </MaterialIcon>
                                    </div>
                                    <div className="env-card-info">
                                        <div className="env-card-title-row">
                                            <strong className="env-card-name">{env.name}</strong>
                                            {isActive && (
                                                <span className="env-active-badge">Active</span>
                                            )}
                                        </div>
                                        <div className="env-card-meta">
                                            <span className="env-var-badge">
                                                {varCount} {varCount === 1 ? "var" : "vars"}
                                                {enabledCount !== varCount && ` (${enabledCount} on)`}
                                            </span>
                                            {env.description && (
                                                <span className="env-desc-preview" title={env.description}>
                                                    {env.description}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="env-card-actions" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        className="icon-button env-menu-trigger-btn"
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setContextMenu({
                                                env,
                                                anchorEl: {
                                                    getBoundingClientRect: () => rect,
                                                },
                                            });
                                        }}
                                        title="Environment options"
                                        aria-label={`Options for ${env.name}`}
                                    >
                                        <MaterialIcon size={16}>more_vert</MaterialIcon>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    anchorEl={contextMenu.anchorEl}
                    onClose={() => setContextMenu(null)}
                    items={[
                        {
                            label:
                                contextMenu.env._id === activeEnvironmentId
                                    ? "Deactivate Environment"
                                    : "Set as Active",
                            icon: contextMenu.env._id === activeEnvironmentId ? "check_circle" : "radio_button_checked",
                            onClick: () => {
                                onSelectEnvironment(
                                    contextMenu.env._id === activeEnvironmentId ? null : contextMenu.env._id
                                );
                            },
                        },
                        {
                            label: "Edit Environment",
                            icon: "edit",
                            onClick: () => onEditEnvironment(contextMenu.env),
                        },
                        {
                            label: "Duplicate",
                            icon: "content_copy",
                            onClick: () => onDuplicateEnvironment(contextMenu.env._id),
                        },
                        {
                            label: "Delete",
                            icon: "delete",
                            danger: true,
                            onClick: () => {
                                setDeleteTarget({
                                    id: contextMenu.env._id,
                                    name: contextMenu.env.name,
                                });
                            },
                        },
                    ]}
                />
            )}

            {/* Confirm Delete Modal */}
            {deleteTarget && (
                <ConfirmModal
                    open={Boolean(deleteTarget)}
                    title="Delete Environment"
                    message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
                    confirmLabel="Delete"
                    confirmVariant="danger"
                    loading={isDeleting}
                    onConfirm={handleConfirmDelete}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}
