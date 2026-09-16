import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "../../shared/components/Modal.jsx";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

export function CollectionModal({
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
            setError("Collection name is required.");
            return;
        }
        if (trimmedName.length > 120) {
            setError("Collection name cannot exceed 120 characters.");
            return;
        }
        onSave({
            name: trimmedName,
            description: description.trim(),
        });
    };

    return createPortal(
        <Modal className="save-request-dialog-modal" label={isEdit ? "Edit Collection" : "Create Collection"} onClose={onClose}>
            <div className="save-request-dialog">
                <div className="save-request-header">
                    <div className="save-request-title-group">
                        <span className="save-request-icon" style={{ background: "rgba(255, 108, 55, 0.15)", color: "#ff6c37" }}>
                            <MaterialIcon size={20}>folder_special</MaterialIcon>
                        </span>
                        <h2>{isEdit ? "Edit Collection" : "New Collection"}</h2>
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
                        Collections group related requests together with shared authentication and organization.
                    </p>

                    <div className="form-group">
                        <label htmlFor="collection-name-input">
                            Collection Name <span className="required-star">*</span>
                        </label>
                        <input
                            id="collection-name-input"
                            type="text"
                            className="postman-text-input"
                            value={name}
                            placeholder="e.g. Stripe Payments API"
                            onChange={(e) => {
                                setName(e.target.value);
                                if (error) setError("");
                            }}
                            autoFocus
                        />
                        {error && <span className="input-error-msg">{error}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="collection-desc-input">Description (Optional)</label>
                        <textarea
                            id="collection-desc-input"
                            className="postman-text-input"
                            rows={3}
                            value={description}
                            placeholder="Briefly describe the purpose of this collection..."
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
                                <span>{isEdit ? "Save Changes" : "Create Collection"}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>,
        document.body,
    );
}
