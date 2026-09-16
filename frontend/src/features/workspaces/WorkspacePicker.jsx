import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal.jsx";
import { EditWorkspaceModal } from "./EditWorkspaceModal.jsx";

const WORKSPACE_ICONS = {
    personal: "person",
    team: "business",
    custom: "workspaces",
};

/** Renders the dropdown at a fixed screen position so it escapes all overflow:hidden parents */
function OptionsDropdown({ anchor, workspace, onEdit, onDelete, onClose }) {
    const ref = useRef(null);

    // Close on outside click or Escape
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        const keyHandler = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("mousedown", handler);
        document.addEventListener("keydown", keyHandler);
        return () => {
            document.removeEventListener("mousedown", handler);
            document.removeEventListener("keydown", keyHandler);
        };
    }, [onClose]);

    // Position: below and right-aligned to anchor rect
    const style = {
        position: "fixed",
        top: anchor.bottom + 6,
        right: window.innerWidth - anchor.right,
        zIndex: 9999,
        minWidth: 130,
        padding: "4px",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        background: "var(--surface)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.28)",
        animation: "menu-pop 120ms ease",
    };

    return createPortal(
        <div ref={ref} style={style} role="menu">
            <button
                type="button"
                className="workspace-options-menu-item"
                role="menuitem"
                onClick={() => { onEdit(); onClose(); }}
            >
                <MaterialIcon size={15}>edit</MaterialIcon>
                Edit
            </button>
            {!workspace.isDefault && (
                <button
                    type="button"
                    className="workspace-options-menu-item workspace-options-menu-item--danger"
                    role="menuitem"
                    onClick={() => { onDelete(); onClose(); }}
                >
                    <MaterialIcon size={15}>delete</MaterialIcon>
                    Delete
                </button>
            )}
        </div>,
        document.body
    );
}

export function WorkspacePicker({
    workspaces = [],
    loading = false,
    error = "",
    onSelect,
    onCreateWorkspace,
    onUpdateWorkspace,
    onDeleteWorkspace,
    onLogout,
    onRetry,
}) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingWorkspace, setEditingWorkspace] = useState(null);
    /** { id, rect } or null */
    const [openMenu, setOpenMenu] = useState(null);

    const handleCreate = async (data) => {
        await onCreateWorkspace(data);
        setIsCreateOpen(false);
    };

    const handleSave = async (data) => {
        await onUpdateWorkspace(editingWorkspace._id, data);
        setEditingWorkspace(null);
    };

    const handleDelete = async () => {
        await onDeleteWorkspace(editingWorkspace._id);
        setEditingWorkspace(null);
    };

    const toggleMenu = useCallback((e, workspace) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setOpenMenu((prev) =>
            prev?.id === String(workspace._id) ? null : { id: String(workspace._id), rect, workspace }
        );
    }, []);

    return (
        <main className="profile-picker-page">
            <section className="profile-picker-card" aria-labelledby="workspace-picker-title">
                {/* Fixed header */}
                <div className="profile-picker-header">
                    <div className="profile-picker-mark">
                        <span className="postman-logo-icon" style={{ width: 44, height: 44, fontSize: 22 }}>R</span>
                    </div>
                    <h1 id="workspace-picker-title">Choose a workspace</h1>
                    <p className="profile-picker-subtitle">Select a workspace to continue</p>
                </div>

                {loading && (
                    <div className="profile-picker-status" role="status">
                        <span className="profile-loader" />
                        Loading workspaces…
                    </div>
                )}

                {!loading && error && (
                    <div className="profile-picker-error" role="alert">
                        <div>
                            <strong>Workspaces couldn't be loaded</strong>
                            <span>{error}</span>
                        </div>
                        <button type="button" onClick={onRetry}>Try again</button>
                    </div>
                )}

                {!loading && !error && (
                    <div className="profile-picker-body">
                        <div className="profile-picker-scroll">
                            <ul className="profile-account-list">
                                {workspaces.map((workspace) => {
                                    const iconName = WORKSPACE_ICONS[workspace.type] || "workspaces";
                                    const isMenuOpen = openMenu?.id === String(workspace._id);
                                    return (
                                        <li key={workspace._id} className="workspace-row">
                                            {/* Main row button */}
                                            <button
                                                type="button"
                                                className="profile-account workspace-picker-item"
                                                onClick={() => { setOpenMenu(null); onSelect(workspace); }}
                                                aria-label={`Open workspace ${workspace.name}`}
                                            >
                                                <span
                                                    className="profile-account-icon"
                                                    style={{
                                                        background: workspace.isDefault ? "rgba(255,108,55,0.15)" : "var(--surface-muted)",
                                                        color: workspace.isDefault ? "#ff6c37" : "var(--ink-strong)",
                                                    }}
                                                >
                                                    <MaterialIcon size={20}>{iconName}</MaterialIcon>
                                                </span>
                                                <span className="workspace-row-text">
                                                    <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                        {workspace.name}
                                                        {workspace.isDefault && (
                                                            <span style={{
                                                                fontSize: "11px", padding: "1px 6px", borderRadius: "4px",
                                                                background: "rgba(255,108,55,0.15)", color: "#ff6c37", fontWeight: 600,
                                                            }}>Default</span>
                                                        )}
                                                    </strong>
                                                    <small>{workspace.description || `${workspace.name} workspace`}</small>
                                                </span>
                                                <MaterialIcon size={18} style={{ flexShrink: 0, color: "var(--muted)", opacity: isMenuOpen ? 0 : 1, transition: "opacity 0.12s" }}>
                                                    chevron_right
                                                </MaterialIcon>
                                            </button>

                                            {/* ⋯ button — sibling, not overlapping */}
                                            <div className="workspace-options-wrap">
                                                <button
                                                    type="button"
                                                    className={`workspace-options-btn${isMenuOpen ? " workspace-options-btn--active" : ""}`}
                                                    onClick={(e) => toggleMenu(e, workspace)}
                                                    aria-label={`Options for ${workspace.name}`}
                                                    aria-haspopup="menu"
                                                    aria-expanded={isMenuOpen}
                                                    title="Options"
                                                >
                                                    <MaterialIcon size={16}>more_horiz</MaterialIcon>
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Pinned bottom actions */}
                        <div className="profile-picker-pinned">
                            <button
                                type="button"
                                className="profile-account workspace-create-item"
                                onClick={() => setIsCreateOpen(true)}
                                style={{ color: "var(--brand-orange,#ff6c37)", fontWeight: 600, background: "rgba(255,108,55,0.04)" }}
                            >
                                <span className="profile-account-icon" style={{ background: "rgba(255,108,55,0.15)", color: "var(--brand-orange,#ff6c37)" }}>
                                    <MaterialIcon size={20}>add</MaterialIcon>
                                </span>
                                <span>
                                    <strong style={{ color: "var(--brand-orange,#ff6c37)" }}>+ Create Workspace</strong>
                                    <small>Set up a new isolated workspace</small>
                                </span>
                            </button>

                            <button
                                type="button"
                                className="profile-account profile-account-signout"
                                style={{ borderTop: "1px solid var(--border)" }}
                                onClick={onLogout}
                            >
                                <span className="profile-account-icon">
                                    <MaterialIcon size={20}>logout</MaterialIcon>
                                </span>
                                <span><strong>Sign out</strong></span>
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Portal dropdown — escapes all overflow:hidden parents */}
            {openMenu && (
                <OptionsDropdown
                    anchor={openMenu.rect}
                    workspace={openMenu.workspace}
                    onEdit={() => setEditingWorkspace(openMenu.workspace)}
                    onDelete={() => setEditingWorkspace(openMenu.workspace)}
                    onClose={() => setOpenMenu(null)}
                />
            )}

            {isCreateOpen && (
                <CreateWorkspaceModal onClose={() => setIsCreateOpen(false)} onCreate={handleCreate} />
            )}

            {editingWorkspace && (
                <EditWorkspaceModal
                    workspace={editingWorkspace}
                    onClose={() => setEditingWorkspace(null)}
                    onSave={handleSave}
                    onDelete={handleDelete}
                />
            )}

            <footer className="workspace-login-footer">
                <span>English (United States)</span>
                <span>Privacy</span>
                <span>Terms</span>
            </footer>
        </main>
    );
}
