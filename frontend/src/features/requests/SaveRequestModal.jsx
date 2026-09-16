import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "../../shared/components/Modal.jsx";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

export function SaveRequestModal({
    initialName = "",
    initialCollectionId = null,
    initialFolderId = null,
    collections = [],
    collectionsLoading = false,
    onSave,
    onClose,
    saving = false,
}) {
    const [name, setName] = useState(initialName || "My Request");
    const [selectedCollectionId, setSelectedCollectionId] = useState(initialCollectionId || "");
    const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId || "");
    const [error, setError] = useState("");

    const selectedCollection = collections.find((c) => c._id === selectedCollectionId);
    const availableFolders = selectedCollection?.folders || [];

    const handleCollectionChange = (e) => {
        setSelectedCollectionId(e.target.value);
        setSelectedFolderId("");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            setError("Please enter a request name.");
            return;
        }
        onSave({
            name: trimmed,
            isCustomName: true,
            collectionId: selectedCollectionId || null,
            folderId: selectedFolderId || null,
        });
    };

    return createPortal(
        <Modal className="save-request-dialog-modal" label="Save Request" onClose={onClose}>
            <div className="save-request-dialog">
                <div className="save-request-header">
                    <div className="save-request-title-group">
                        <span className="save-request-icon">
                            <MaterialIcon size={20}>save</MaterialIcon>
                        </span>
                        <h2>Save Request</h2>
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
                        Save this request to your workspace to quickly re-run, modify, and organize it.
                    </p>

                    <div className="form-group">
                        <label htmlFor="req-name-input">
                            Request Name <span className="required-star">*</span>
                        </label>
                        <input
                            id="req-name-input"
                            type="text"
                            className="postman-text-input"
                            value={name}
                            placeholder="e.g. Fetch Active Users"
                            onChange={(e) => {
                                setName(e.target.value);
                                if (error) setError("");
                            }}
                            autoFocus
                        />
                        {error && (
                            <span className="field-error">
                                <MaterialIcon size={14}>error_outline</MaterialIcon>
                                <span>{error}</span>
                            </span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="save-req-collection-select">Collection (Optional)</label>
                        <select
                            id="save-req-collection-select"
                            className="postman-select-input"
                            value={selectedCollectionId}
                            onChange={handleCollectionChange}
                            disabled={collectionsLoading}
                        >
                            {collectionsLoading ? (
                                <option value="">Loading collections…</option>
                            ) : (
                                <>
                                    <option value="">None (Uncategorized Request)</option>
                                    {collections.length === 0 && (
                                        <option value="" disabled>No collections yet — create one first</option>
                                    )}
                                    {collections.map((c) => (
                                        <option key={c._id} value={c._id}>
                                            📁 {c.name}
                                        </option>
                                    ))}
                                </>
                            )}
                        </select>
                    </div>

                    {selectedCollectionId && (
                        <div className="form-group">
                            <label htmlFor="save-req-folder-select">Folder (Optional)</label>
                            <select
                                id="save-req-folder-select"
                                className="postman-select-input"
                                value={selectedFolderId}
                                onChange={(e) => setSelectedFolderId(e.target.value)}
                            >
                                <option value="">(Root of Collection)</option>
                                {availableFolders.map((f) => (
                                    <option key={f._id} value={f._id}>
                                        📂 {f.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="save-request-footer">
                        <button
                            type="button"
                            className="btn-modal-cancel"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-modal-save"
                            disabled={saving || !name.trim()}
                        >
                            {saving ? "Saving…" : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>,
        document.body,
    );
}
