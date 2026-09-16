import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "../../shared/components/Modal.jsx";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

export function MoveRequestModal({
    requestName = "",
    currentCollectionId = null,
    currentFolderId = null,
    collections = [],
    onMove,
    onClose,
    moving = false,
}) {
    const [selectedCollectionId, setSelectedCollectionId] = useState(currentCollectionId || "");
    const [selectedFolderId, setSelectedFolderId] = useState(currentFolderId || "");

    const selectedCollection = collections.find((c) => c._id === selectedCollectionId);
    const availableFolders = selectedCollection?.folders || [];

    const handleCollectionChange = (e) => {
        const newColId = e.target.value;
        setSelectedCollectionId(newColId);
        setSelectedFolderId(""); // reset folder when collection changes
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onMove({
            collectionId: selectedCollectionId || null,
            folderId: selectedFolderId || null,
        });
    };

    return createPortal(
        <Modal className="save-request-dialog-modal" label="Move Request" onClose={onClose}>
            <div className="save-request-dialog">
                <div className="save-request-header">
                    <div className="save-request-title-group">
                        <span className="save-request-icon" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#a855f7" }}>
                            <MaterialIcon size={20}>drive_file_move</MaterialIcon>
                        </span>
                        <div>
                            <h2>Move Request</h2>
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                {requestName}
                            </span>
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
                        Select a destination collection and optional folder for this request.
                    </p>

                    <div className="form-group">
                        <label htmlFor="move-collection-select">Destination Collection</label>
                        <select
                            id="move-collection-select"
                            className="postman-select-input"
                            value={selectedCollectionId}
                            onChange={handleCollectionChange}
                        >
                            <option value="">None (Uncategorized)</option>
                            {collections.map((c) => (
                                <option key={c._id} value={c._id}>
                                    📁 {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedCollectionId && (
                        <div className="form-group">
                            <label htmlFor="move-folder-select">Destination Folder</label>
                            <select
                                id="move-folder-select"
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

                    <div className="save-request-actions">
                        <button
                            type="button"
                            className="postman-btn postman-btn-secondary"
                            onClick={onClose}
                            disabled={moving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="postman-btn postman-btn-primary"
                            disabled={moving}
                        >
                            {moving ? (
                                <>
                                    <span className="button-spinner" />
                                    <span>Moving...</span>
                                </>
                            ) : (
                                <span>Move Request</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>,
        document.body,
    );
}
