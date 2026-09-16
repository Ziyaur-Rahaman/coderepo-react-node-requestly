import React from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "./MaterialIcon.jsx";

export function ConfirmModal({
    open,
    title = "Delete Request",
    message = "Are you sure you want to delete this item? This action cannot be undone.",
    confirmLabel = "Delete",
    confirmVariant = "danger",
    loading = false,
    onConfirm,
    onClose,
}) {
    if (!open) return null;

    return createPortal(
        <div className="confirm-modal-overlay" onClick={onClose}>
            <div
                className="confirm-modal-box"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="confirm-modal-header">
                    <span className={`confirm-modal-icon ${confirmVariant}`}>
                        <MaterialIcon size={20}>
                            {confirmVariant === "danger" ? "delete" : "info"}
                        </MaterialIcon>
                    </span>
                    <h3>{title}</h3>
                </div>
                <div className="confirm-modal-body">
                    <p>{message}</p>
                </div>
                <div className="confirm-modal-actions">
                    <button
                        type="button"
                        className="btn-modal-cancel"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={`btn-modal-confirm ${confirmVariant}`}
                        onClick={onConfirm}
                        disabled={loading}
                        autoFocus
                    >
                        {loading ? "Deleting..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
