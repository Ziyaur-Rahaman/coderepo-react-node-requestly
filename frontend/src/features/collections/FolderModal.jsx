import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "../../shared/components/Modal.jsx";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

export function FolderModal({
    collectionName = "",
    initialData = null,
    onSave,
    onClose,
    saving = false,
}) {
    const isEdit = Boolean(initialData && initialData._id);
    const [name, setName] = useState(initialData?.name || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Folder name is required.");
            return;
        }
        if (trimmedName.length > 120) {
            setError("Folder name cannot exceed 120 characters.");
            return;
        }
        onSave({
            name: trimmedName,
            description: description.trim(),
        });
    };

    return createPortal(
        <Modal className="save-request-dialog-modal" label={isEdit ? "Edit Folder" : "New Folder"} onClose={onClose}>
            <div className="save-request-dialog">
                <div className="save-request-header">
                    <div className="save-request-title-group">
                        <span className="save-request-icon" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
                            <MaterialIcon size={20}>folder</MaterialIcon>
                        </span>
                        <div>
                            <h2>{isEdit ? "Edit Folder" : "New Folder"}</h2>
                            {collectionName && (
                                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                    in {collectionName}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        className="icon-button modal-close-btn"
                        onClick={onClose}
                        title="Close dialog"
                        aria-label="Close dialog"
                    >
                        <MaterialIcon size={18}>close</MaterialIcon>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="save-request-form">
                    <p className="save-request-description">
                        Folders help organize endpoints within a collection by resource, version, or workflow.
                    </p>

                    <div className="form-group">
                        <label htmlFor="folder-name-input">
                            Folder Name <span className="required-star">*</span>
                        </label>
                        <input
                            id="folder-name-input"
                            type="text"
                            className="postman-text-input"
                            value={name}
                            placeholder="e.g. Users, Checkout, Webhooks"
                            onChange={(e) => {
                                setName(e.target.value);
                                if (error) setError("");
                            }}
                            autoFocus
                        />
                        {error && <span className="input-error-msg">{error}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="folder-desc-input">Description (Optional)</label>
                        <textarea
                            id="folder-desc-input"
                            className="postman-text-input"
                            rows={3}
                            value={description}
                            placeholder="Briefly describe the purpose of this folder..."
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="save-request-actions">
                        <button
                            type="button"
                            className="postman-btn postman-btn-secondary"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="postman-btn postman-btn-primary"
                            disabled={saving || !name.trim()}
                        >
                            {saving ? (
                                <>
                                    <span className="button-spinner" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <span>{isEdit ? "Save Changes" : "Create Folder"}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>,
        document.body,
    );
}
