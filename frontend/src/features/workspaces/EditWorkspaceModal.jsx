import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "../../shared/components/Modal.jsx";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

export function EditWorkspaceModal({ workspace, onClose, onSave, onDelete }) {
    const [name, setName] = useState(workspace.name || "");
    const [description, setDescription] = useState(workspace.description || "");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) { setError("Workspace name is required."); return; }
        if (trimmed.length > 120) { setError("Workspace name must be at most 120 characters."); return; }
        try {
            setSubmitting(true);
            setError("");
            await onSave({ name: trimmed, description: description.trim() });
        } catch (err) {
            setError(err.message || "Failed to update workspace.");
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            setDeleting(true);
            setError("");
            await onDelete();
        } catch (err) {
            setError(err.message || "Failed to delete workspace.");
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    const isDefault = workspace.isDefault;

    return createPortal(
        <Modal className="save-request-dialog-modal" label="Edit Workspace" onClose={onClose}>
            <div className="save-request-dialog" style={{ width: "100%" }}>
                {/* Header */}
                <div
                    className="save-request-header"
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        padding: "20px 24px 16px",
                        borderBottom: "1px solid var(--border)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                        <span
                            className="save-request-icon"
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                background: "rgba(255, 108, 55, 0.12)",
                                color: "var(--brand-orange, #ff6c37)",
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                            }}
                        >
                            <MaterialIcon size={20}>edit</MaterialIcon>
                        </span>
                        <div>
                            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: "var(--ink-strong)", lineHeight: "22px" }}>
                                Edit Workspace
                            </h2>
                            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0", lineHeight: "16px" }}>
                                Update workspace name and description
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="modal-close-btn"
                        onClick={onClose}
                        disabled={submitting || deleting}
                        aria-label="Close"
                        style={{
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            color: "var(--muted)",
                            padding: "4px",
                            borderRadius: "6px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <MaterialIcon size={18}>close</MaterialIcon>
                    </button>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSave}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                        padding: "20px 24px 24px",
                    }}
                >
                    {error && (
                        <div
                            role="alert"
                            style={{
                                padding: "8px 12px",
                                borderRadius: "8px",
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                color: "#ef4444",
                                fontSize: "13px",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label htmlFor="edit-workspace-name" style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink-strong)" }}>
                            Workspace Name <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                            id="edit-workspace-name"
                            type="text"
                            autoFocus
                            placeholder="e.g. My API Team, Testing, Production"
                            value={name}
                            onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
                            disabled={submitting || deleting}
                            required
                            style={{
                                width: "100%",
                                height: "38px",
                                padding: "0 12px",
                                borderRadius: "6px",
                                border: "1px solid var(--border)",
                                background: "var(--surface)",
                                color: "var(--ink)",
                                fontSize: "14px",
                                outline: "none",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label htmlFor="edit-workspace-desc" style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink-strong)" }}>
                            Description <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 400 }}>(Optional)</span>
                        </label>
                        <textarea
                            id="edit-workspace-desc"
                            rows={3}
                            placeholder="What is this workspace used for?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={submitting || deleting}
                            style={{
                                width: "100%",
                                padding: "8px 12px",
                                borderRadius: "6px",
                                border: "1px solid var(--border)",
                                background: "var(--surface)",
                                color: "var(--ink)",
                                fontSize: "13px",
                                outline: "none",
                                resize: "vertical",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    {/* Action row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginTop: "6px" }}>
                        {/* Delete section on the left */}
                        {!isDefault && !confirmDelete && (
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                disabled={submitting || deleting}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    height: "36px",
                                    padding: "0 12px",
                                    borderRadius: "6px",
                                    border: "1px solid rgba(239, 68, 68, 0.35)",
                                    background: "rgba(239, 68, 68, 0.06)",
                                    color: "#ef4444",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                }}
                            >
                                <MaterialIcon size={15}>delete</MaterialIcon>
                                Delete
                            </button>
                        )}

                        {!isDefault && confirmDelete && (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Are you sure?</span>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    style={{
                                        height: "32px",
                                        padding: "0 12px",
                                        borderRadius: "6px",
                                        border: "none",
                                        background: "#ef4444",
                                        color: "#fff",
                                        cursor: deleting ? "not-allowed" : "pointer",
                                        opacity: deleting ? 0.7 : 1,
                                        fontSize: "12px",
                                        fontWeight: 600,
                                    }}
                                >
                                    {deleting ? "Deleting…" : "Yes, delete"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmDelete(false)}
                                    disabled={deleting}
                                    style={{
                                        height: "32px",
                                        padding: "0 10px",
                                        borderRadius: "6px",
                                        border: "1px solid var(--border)",
                                        background: "transparent",
                                        color: "var(--ink)",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {isDefault && <span />}

                        {/* Save / Cancel on the right */}
                        <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting || deleting}
                                style={{
                                    height: "36px",
                                    padding: "0 16px",
                                    borderRadius: "6px",
                                    border: "1px solid var(--border)",
                                    background: "transparent",
                                    color: "var(--ink)",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || deleting || !name.trim()}
                                style={{
                                    height: "36px",
                                    padding: "0 18px",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: "var(--brand-orange, #ff6c37)",
                                    color: "#fff",
                                    cursor: submitting || deleting || !name.trim() ? "not-allowed" : "pointer",
                                    opacity: submitting || deleting || !name.trim() ? 0.6 : 1,
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                }}
                            >
                                {submitting ? "Saving…" : "Save changes"}
                            </button>
                        </div>
                    </div>

                    {isDefault && (
                        <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--muted)", textAlign: "right" }}>
                            The default workspace cannot be deleted.
                        </p>
                    )}
                </form>
            </div>
        </Modal>,
        document.body
    );
}
