import React, { useState, useEffect, useCallback } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { ContextMenu } from "../../shared/components/ContextMenu.jsx";
import { collectionApi } from "../collections/collection.api.js";
import { requestApi } from "./request.api.js";
import { CollectionTree } from "../collections/CollectionTree.jsx";
import { CollectionModal } from "../collections/CollectionModal.jsx";
import { FolderModal } from "../collections/FolderModal.jsx";
import { MoveRequestModal } from "../collections/MoveRequestModal.jsx";
import { ConfirmModal } from "../../shared/components/ConfirmModal.jsx";
import { HistoryList } from "../history/HistoryList.jsx";
import { EnvironmentList } from "../environments/EnvironmentList.jsx";

const METHOD_COLORS = {
    GET: "#10b981",
    POST: "#f59e0b",
    PUT: "#3b82f6",
    PATCH: "#8b5cf6",
    DELETE: "#ef4444",
    HEAD: "#06b6d4",
    OPTIONS: "#6b7280",
};

export function RequestSidebar({
    activeRequestId,
    activeHistoryId,
    onSelectRequest,
    onSelectHistory,
    onSaveHistoryToCollection,
    onNewRequest,
    onNewRequestInScope,
    onSendAdhocHealthCheck,
    onDeleteRequest,
    refreshTrigger,
    historyRefreshTrigger,
    environments = [],
    activeEnvironmentId = null,
    onSelectEnvironment,
    onCreateEnvironment,
    onEditEnvironment,
    onDuplicateEnvironment,
    onDeleteEnvironment,
    environmentsLoading = false,
    environmentsError = "",
    onRefreshEnvironments,
    sidebarTab = "collections",
    onTabChange,
}) {
    const [activeTab, setActiveTab] = useState(sidebarTab || "collections");

    useEffect(() => {
        if (sidebarTab) {
            setActiveTab(sidebarTab);
        }
    }, [sidebarTab]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (onTabChange) onTabChange(tab);
    };
    const [activeScope, setActiveScope] = useState(null); // { type, id, collectionId, folderId, name }
    const [treeData, setTreeData] = useState({ collections: [], uncategorizedRequests: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    // Modals state
    const [collectionModal, setCollectionModal] = useState({ open: false, data: null });
    const [folderModal, setFolderModal] = useState({ open: false, collectionId: null, collectionName: "", data: null });
    const [moveModal, setMoveModal] = useState({ open: false, request: null });
    const [modalSaving, setModalSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null); // { type, id, collectionId?, folderId?, name }

    // Uncategorized request menu: { id, anchorEl } or null
    const [uncatMenu, setUncatMenu] = useState(null);

    const loadTree = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const data = await collectionApi.tree();
            setTreeData(data || { collections: [], uncategorizedRequests: [] });
        } catch (err) {
            setError(err.message || "Failed to load collections.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTree();
    }, [loadTree, refreshTrigger]);


    // Collection actions
    const handleSaveCollection = async ({ name, description }) => {
        setModalSaving(true);
        try {
            if (collectionModal.data?._id) {
                await collectionApi.update(collectionModal.data._id, { name, description });
            } else {
                await collectionApi.create({ name, description });
            }
            setCollectionModal({ open: false, data: null });
            await loadTree();
        } catch (err) {
            alert(err.message || "Failed to save collection.");
        } finally {
            setModalSaving(false);
        }
    };

    const handleDuplicateCollection = async (collectionId) => {
        try {
            await collectionApi.duplicate(collectionId);
            await loadTree();
        } catch (err) {
            alert(err.message || "Failed to duplicate collection.");
        }
    };

    const handleDeleteCollection = (collectionId, name) => {
        setDeleteTarget({
            type: "collection",
            id: collectionId,
            name: name || "Untitled Collection",
        });
    };

    // Folder actions
    const handleSaveFolder = async ({ name, description }) => {
        setModalSaving(true);
        try {
            const { collectionId, data } = folderModal;
            if (data?._id) {
                await collectionApi.updateFolder(collectionId, data._id, { name, description });
            } else {
                await collectionApi.createFolder(collectionId, { name, description });
            }
            setFolderModal({ open: false, collectionId: null, collectionName: "", data: null });
            await loadTree();
        } catch (err) {
            alert(err.message || "Failed to save folder.");
        } finally {
            setModalSaving(false);
        }
    };

    const handleDuplicateFolder = async (collectionId, folderId) => {
        try {
            await collectionApi.duplicateFolder(collectionId, folderId);
            await loadTree();
        } catch (err) {
            alert(err.message || "Failed to duplicate folder.");
        }
    };

    const handleDeleteFolder = (collectionId, folderId, name) => {
        setDeleteTarget({
            type: "folder",
            collectionId,
            folderId,
            name: name || "Untitled Folder",
        });
    };

    // Request actions
    const handleDuplicateRequest = async (requestId) => {
        try {
            const duplicated = await requestApi.duplicate(requestId);
            await loadTree();
            if (onSelectRequest && duplicated) onSelectRequest(duplicated);
        } catch (err) {
            alert(err.message || "Failed to duplicate request.");
        }
    };

    const handleDeleteRequest = async (requestId, name) => {
        if (onDeleteRequest) {
            onDeleteRequest(requestId, name);
        } else {
            setDeleteTarget({
                type: "request",
                id: requestId,
                name: name || "Untitled Request",
            });
        }
    };

    const handleConfirmSidebarDelete = async () => {
        if (!deleteTarget) return;
        setModalSaving(true);
        try {
            if (deleteTarget.type === "collection") {
                await collectionApi.remove(deleteTarget.id);
                if (onNewRequest) onNewRequest();
            } else if (deleteTarget.type === "folder") {
                await collectionApi.removeFolder(deleteTarget.collectionId, deleteTarget.folderId);
                if (onNewRequest) onNewRequest();
            } else if (deleteTarget.type === "request") {
                await requestApi.remove(deleteTarget.id);
            }
            setDeleteTarget(null);
            await loadTree();
        } catch (err) {
            alert(err.message || "Failed to delete item.");
        } finally {
            setModalSaving(false);
        }
    };

    const handleMoveRequest = async ({ collectionId, folderId }) => {
        setModalSaving(true);
        try {
            await requestApi.move(moveModal.request._id, { collectionId, folderId });
            setMoveModal({ open: false, request: null });
            await loadTree();
        } catch (err) {
            alert(err.message || "Failed to move request.");
        } finally {
            setModalSaving(false);
        }
    };

    const q = search.toLowerCase().trim();
    const uncategorizedFiltered = (treeData.uncategorizedRequests || []).filter(
        (r) =>
            !q ||
            r.name.toLowerCase().includes(q) ||
            r.url.toLowerCase().includes(q) ||
            r.method.toLowerCase().includes(q),
    );

    return (
        <aside className="postman-sidebar">
            {/* Top Bar Actions: Clean single New Request action */}
            <div className="sidebar-top-bar">
                <button
                    type="button"
                    className="btn-new-request full-width"
                    onClick={() => {
                        if (activeScope?.collectionId) {
                            onNewRequestInScope(activeScope.collectionId, activeScope.folderId);
                        } else {
                            onNewRequest();
                        }
                    }}
                    title={activeScope ? `Create new request in "${activeScope.name}"` : "Create new request"}
                >
                    <MaterialIcon size={18}>add</MaterialIcon>
                    <span>New Request</span>
                </button>
            </div>

            {/* Sidebar Tab Switcher: Collections vs Environments vs History */}
            <div className="sidebar-tab-switcher" role="tablist" aria-label="Sidebar navigation">
                <button
                    type="button"
                    className={`sidebar-tab-btn ${activeTab === "collections" ? "active" : ""}`}
                    onClick={() => handleTabChange("collections")}
                    role="tab"
                    aria-selected={activeTab === "collections"}
                    title={`Collections (${treeData.collections.length})`}
                >
                    <MaterialIcon size={15}>folder_special</MaterialIcon>
                    <span className="tab-label">Collections</span>
                    <span className="tab-pill-badge">{treeData.collections.length}</span>
                </button>
                <button
                    type="button"
                    className={`sidebar-tab-btn ${activeTab === "environments" ? "active" : ""}`}
                    onClick={() => handleTabChange("environments")}
                    role="tab"
                    aria-selected={activeTab === "environments"}
                    title={`Environments (${environments.length})`}
                >
                    <MaterialIcon size={15}>layers</MaterialIcon>
                    <span className="tab-label">Environments</span>
                    {environments.length > 0 && (
                        <span className="tab-pill-badge">{environments.length}</span>
                    )}
                </button>
                <button
                    type="button"
                    className={`sidebar-tab-btn ${activeTab === "history" ? "active" : ""}`}
                    onClick={() => handleTabChange("history")}
                    role="tab"
                    aria-selected={activeTab === "history"}
                    title="Request History"
                >
                    <MaterialIcon size={15}>history</MaterialIcon>
                    <span className="tab-label">History</span>
                </button>
            </div>

            {/* Tab Views */}
            {activeTab === "history" ? (
                <HistoryList
                    activeHistoryId={activeHistoryId}
                    onSelectHistory={onSelectHistory}
                    onSaveToCollection={onSaveHistoryToCollection}
                    onSendAdhocHealthCheck={onSendAdhocHealthCheck}
                    refreshTrigger={historyRefreshTrigger}
                />
            ) : activeTab === "environments" ? (
                <EnvironmentList
                    environments={environments}
                    activeEnvironmentId={activeEnvironmentId}
                    loading={environmentsLoading}
                    error={environmentsError}
                    onRefresh={onRefreshEnvironments}
                    onSelectEnvironment={onSelectEnvironment}
                    onCreateEnvironment={onCreateEnvironment}
                    onEditEnvironment={onEditEnvironment}
                    onDuplicateEnvironment={onDuplicateEnvironment}
                    onDeleteEnvironment={onDeleteEnvironment}
                />
            ) : (
                <>
                    {/* Real-time Search */}
                    <div className="sidebar-search">
                        <MaterialIcon size={16}>search</MaterialIcon>
                        <input
                            type="text"
                            placeholder="Search collections & requests..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Search collections and requests"
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

                    {/* Scope Indicator Banner if a collection/folder is active */}
                    {activeScope && (
                        <div className="sidebar-scope-indicator">
                            <span className="scope-icon">
                                <MaterialIcon size={14}>
                                    {activeScope.type === "collection" ? "folder_special" : "folder"}
                                </MaterialIcon>
                            </span>
                            <span className="scope-text">
                                Target: <strong>{activeScope.name}</strong>
                            </span>
                            <button
                                type="button"
                                className="scope-clear-btn"
                                onClick={() => setActiveScope(null)}
                                title="Clear target scope"
                            >
                                <MaterialIcon size={12}>close</MaterialIcon>
                            </button>
                        </div>
                    )}

                    {/* Tree Container */}
                    <div className="sidebar-list-container">
                        <div className="sidebar-section-header">
                            <span className="section-title">COLLECTIONS ({treeData.collections.length})</span>
                            <div className="section-header-actions">
                                <button
                                    type="button"
                                    className="icon-button header-add-collection-btn"
                                    onClick={() => setCollectionModal({ open: true, data: null })}
                                    title="Create new collection"
                                    aria-label="Create new collection"
                                >
                                    <MaterialIcon size={16}>add</MaterialIcon>
                                </button>
                                <button
                                    type="button"
                                    className="icon-button header-refresh-btn"
                                    onClick={loadTree}
                                    title="Refresh collections"
                                    aria-label="Refresh collections"
                                >
                                    <MaterialIcon size={15}>refresh</MaterialIcon>
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="sidebar-loading">
                                <span className="spinner-small" />
                                <span>Loading collections...</span>
                            </div>
                        ) : error ? (
                            <div className="sidebar-error">
                                <span>{error}</span>
                                <button type="button" onClick={loadTree}>
                                    Retry
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Collections Tree */}
                                {treeData.collections.length === 0 ? (
                                    <div className="sidebar-empty-box">
                                        <span className="empty-icon">📁</span>
                                        <p>No collections yet</p>
                                        <button
                                            type="button"
                                            className="btn-empty-action"
                                            onClick={() => setCollectionModal({ open: true, data: null })}
                                        >
                                            + Create Collection
                                        </button>
                                    </div>
                                ) : (
                                    <CollectionTree
                                        collections={treeData.collections}
                                        activeRequestId={activeRequestId}
                                        activeScopeId={activeScope?.id}
                                        onScopeChange={setActiveScope}
                                        onSelectRequest={onSelectRequest}
                                        onNewRequestInScope={onNewRequestInScope || onNewRequest}
                                        onOpenCollectionModal={(coll) => setCollectionModal({ open: true, data: coll })}
                                        onOpenFolderModal={(collId, collName, folder) =>
                                            setFolderModal({
                                                open: true,
                                                collectionId: collId,
                                                collectionName: collName,
                                                data: folder || null,
                                            })
                                        }
                                        onOpenMoveModal={(req) => setMoveModal({ open: true, request: req })}
                                        onDuplicateCollection={handleDuplicateCollection}
                                        onDeleteCollection={handleDeleteCollection}
                                        onDuplicateFolder={handleDuplicateFolder}
                                        onDeleteFolder={handleDeleteFolder}
                                        onDuplicateRequest={handleDuplicateRequest}
                                        onDeleteRequest={handleDeleteRequest}
                                        filterQuery={search}
                                    />
                                )}

                                {/* Uncategorized Requests Section */}
                                {uncategorizedFiltered.length > 0 && (
                                    <div className="sidebar-uncategorized-section">
                                        <div className="sidebar-section-header uncategorized-header">
                                            <span>UNCATEGORIZED ({uncategorizedFiltered.length})</span>
                                        </div>
                                        <div className="uncategorized-list">
                                            {uncategorizedFiltered.map((req) => {
                                                const isSelected = activeRequestId === req._id;
                                                const methodColor = METHOD_COLORS[req.method] || "#94a3b8";

                                                return (
                                                    <div key={req._id} className="tree-request-wrapper">
                                                        <div
                                                            className={`tree-node-row tree-request-row ${isSelected ? "active" : ""}`}
                                                            onClick={() => onSelectRequest(req)}
                                                            title={`${req.method} ${req.url}`}
                                                        >
                                                            <span
                                                                className="tree-method-badge"
                                                                style={{
                                                                    color: methodColor,
                                                                    borderColor: `${methodColor}40`,
                                                                    backgroundColor: `${methodColor}15`,
                                                                }}
                                                            >
                                                                {req.method}
                                                            </span>
                                                            <span className="tree-request-name">{req.name}</span>
                                                            <div className="tree-actions-group">
                                                                <button
                                                                    type="button"
                                                                    className="tree-action-btn tree-action-delete"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteRequest(req._id, req.name);
                                                                    }}
                                                                    title={`Delete "${req.name}"`}
                                                                    aria-label={`Delete "${req.name}"`}
                                                                >
                                                                    <MaterialIcon size={14}>delete</MaterialIcon>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="tree-action-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setUncatMenu(
                                                                            uncatMenu?.id === req._id
                                                                                ? null
                                                                                : { id: req._id, anchorEl: e.currentTarget },
                                                                        );
                                                                    }}
                                                                    title="Request options"
                                                                    aria-label="Request options"
                                                                >
                                                                    <MaterialIcon size={15}>more_vert</MaterialIcon>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {uncatMenu?.id === req._id && (
                                                            <ContextMenu
                                                                anchorEl={uncatMenu.anchorEl}
                                                                onClose={() => setUncatMenu(null)}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className="dropdown-action-item"
                                                                    onClick={async () => {
                                                                        setUncatMenu(null);
                                                                        const newName = prompt("Rename request:", req.name);
                                                                        if (newName && newName.trim() && newName.trim() !== req.name) {
                                                                            try {
                                                                                await requestApi.update(req._id, { name: newName.trim() });
                                                                                await loadTree();
                                                                                if (activeRequestId === req._id && onSelectRequest) {
                                                                                    onSelectRequest({ ...req, name: newName.trim() });
                                                                                }
                                                                            } catch (err) {
                                                                                alert(err.message || "Failed to rename request.");
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    <MaterialIcon size={15}>edit</MaterialIcon>
                                                                    <span>Rename Request</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="dropdown-action-item"
                                                                    onClick={() => {
                                                                        setUncatMenu(null);
                                                                        handleDuplicateRequest(req._id);
                                                                    }}
                                                                >
                                                                    <MaterialIcon size={15}>content_copy</MaterialIcon>
                                                                    <span>Duplicate Request</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="dropdown-action-item"
                                                                    onClick={() => {
                                                                        setUncatMenu(null);
                                                                        setMoveModal({ open: true, request: req });
                                                                    }}
                                                                >
                                                                    <MaterialIcon size={15}>drive_file_move</MaterialIcon>
                                                                    <span>Move to Collection...</span>
                                                                </button>
                                                                <div className="dropdown-divider" />
                                                                <button
                                                                    type="button"
                                                                    className="dropdown-action-item danger"
                                                                    onClick={() => {
                                                                        setUncatMenu(null);
                                                                        handleDeleteRequest(req._id, req.name);
                                                                    }}
                                                                >
                                                                    <MaterialIcon size={15}>delete</MaterialIcon>
                                                                    <span>Delete Request</span>
                                                                </button>
                                                            </ContextMenu>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Collection Modal */}
            {collectionModal.open && (
                <CollectionModal
                    initialData={collectionModal.data}
                    onSave={handleSaveCollection}
                    onClose={() => setCollectionModal({ open: false, data: null })}
                    saving={modalSaving}
                />
            )}

            {/* Folder Modal */}
            {folderModal.open && (
                <FolderModal
                    collectionName={folderModal.collectionName}
                    initialData={folderModal.data}
                    onSave={handleSaveFolder}
                    onClose={() =>
                        setFolderModal({ open: false, collectionId: null, collectionName: "", data: null })
                    }
                    saving={modalSaving}
                />
            )}

            {/* Move Request Modal */}
            {moveModal.open && (
                <MoveRequestModal
                    requestName={moveModal.request?.name}
                    currentCollectionId={moveModal.request?.collectionId}
                    currentFolderId={moveModal.request?.folderId}
                    collections={treeData.collections}
                    onMove={handleMoveRequest}
                    onClose={() => setMoveModal({ open: false, request: null })}
                    moving={modalSaving}
                />
            )}

            {/* In-app Sidebar Delete Confirmation Modal */}
            <ConfirmModal
                open={!!deleteTarget}
                title={
                    deleteTarget?.type === "collection"
                        ? "Delete Collection"
                        : deleteTarget?.type === "folder"
                        ? "Delete Folder"
                        : "Delete Request"
                }
                message={
                    deleteTarget?.type === "collection"
                        ? `Are you sure you want to delete collection "${deleteTarget.name}" and all its folders and requests? This action cannot be undone.`
                        : deleteTarget?.type === "folder"
                        ? `Are you sure you want to delete folder "${deleteTarget.name}" and all its requests? This action cannot be undone.`
                        : `Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`
                }
                confirmLabel="Delete"
                confirmVariant="danger"
                loading={modalSaving}
                onConfirm={handleConfirmSidebarDelete}
                onClose={() => setDeleteTarget(null)}
            />
        </aside>
    );
}
