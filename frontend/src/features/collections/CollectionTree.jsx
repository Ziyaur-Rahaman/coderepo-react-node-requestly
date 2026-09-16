import React, { useState, useEffect, useCallback } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { ContextMenu } from "../../shared/components/ContextMenu.jsx";
import { DescriptionPopover } from "./DescriptionPopover.jsx";
import { requestApi } from "../requests/request.api.js";

const METHOD_COLORS = {
    GET: "#10b981",
    POST: "#f59e0b",
    PUT: "#3b82f6",
    PATCH: "#8b5cf6",
    DELETE: "#ef4444",
    HEAD: "#06b6d4",
    OPTIONS: "#6b7280",
};


export function CollectionTree({
    collections = [],
    activeRequestId,
    activeScopeId,
    onScopeChange,
    onSelectRequest,
    onNewRequestInScope,
    onOpenCollectionModal,
    onOpenFolderModal,
    onOpenMoveModal,
    onDuplicateCollection,
    onDeleteCollection,
    onDuplicateFolder,
    onDeleteFolder,
    onDuplicateRequest,
    onDeleteRequest,
    filterQuery = "",
}) {
    const [expandedCollections, setExpandedCollections] = useState({});
    const [expandedFolders, setExpandedFolders] = useState({});
    // activeMenu: { type, id, anchorEl }
    const [activeMenu, setActiveMenu] = useState(null);
    // activeInfo: { id, name, type, description, anchorEl }
    const [activeInfo, setActiveInfo] = useState(null);

    // Default expand all collections and folders on initial load
    useEffect(() => {
        const collMap = {};
        const folderMap = {};
        collections.forEach((c) => {
            collMap[c._id] = true;
            (c.folders || []).forEach((f) => {
                folderMap[f._id] = true;
            });
        });
        setExpandedCollections((prev) => ({ ...collMap, ...prev }));
        setExpandedFolders((prev) => ({ ...folderMap, ...prev }));
    }, [collections]);

    const closeMenu = useCallback(() => setActiveMenu(null), []);

    const toggleCollection = (id, e) => {
        e.stopPropagation();
        setExpandedCollections((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleFolder = (id, e) => {
        e.stopPropagation();
        setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleMenuClick = (e, menuData) => {
        e.stopPropagation();
        e.preventDefault();
        if (activeMenu?.id === menuData.id && activeMenu?.type === menuData.type) {
            setActiveMenu(null);
        } else {
            setActiveMenu({ ...menuData, anchorEl: e.currentTarget });
        }
    };

    const handleInfoClick = (e, infoData) => {
        e.stopPropagation();
        e.preventDefault();
        if (activeInfo?.id === infoData.id) {
            setActiveInfo(null);
        } else {
            setActiveInfo({ ...infoData, anchorEl: e.currentTarget });
        }
    };

    const q = filterQuery.toLowerCase().trim();

    return (
        <div className="collection-tree-root">
            {collections.map((coll) => {
                const isCollExpanded = expandedCollections[coll._id] ?? true;
                const folders = coll.folders || [];
                const rootRequests = coll.requests || [];

                // Calculate total count
                const totalReqCount =
                    rootRequests.length +
                    folders.reduce((acc, f) => acc + (f.requests?.length || 0), 0);

                // Filter check
                const collMatches = !q || coll.name.toLowerCase().includes(q);
                const matchingFolders = folders.filter(
                    (f) =>
                        collMatches ||
                        f.name.toLowerCase().includes(q) ||
                        (f.requests || []).some(
                            (r) =>
                                r.name.toLowerCase().includes(q) ||
                                r.url.toLowerCase().includes(q) ||
                                r.method.toLowerCase().includes(q),
                        ),
                );
                const matchingRootReqs = rootRequests.filter(
                    (r) =>
                        collMatches ||
                        r.name.toLowerCase().includes(q) ||
                        r.url.toLowerCase().includes(q) ||
                        r.method.toLowerCase().includes(q),
                );

                if (q && !collMatches && matchingFolders.length === 0 && matchingRootReqs.length === 0) {
                    return null;
                }

                return (
                    <div key={coll._id} className="tree-collection-node">
                        {/* Collection Header Row */}
                        <div
                            className={`tree-node-row tree-collection-header ${activeScopeId === coll._id ? "active-scope" : ""}`}
                            onClick={(e) => {
                                toggleCollection(coll._id, e);
                                if (onScopeChange) {
                                    onScopeChange({ type: "collection", id: coll._id, collectionId: coll._id, folderId: null, name: coll.name });
                                }
                            }}
                            title={coll.description || coll.name}
                        >
                            <span className="tree-expand-icon">
                                <MaterialIcon size={16}>
                                    {isCollExpanded ? "expand_more" : "chevron_right"}
                                </MaterialIcon>
                            </span>
                            <span className="tree-icon collection-icon">
                                <MaterialIcon size={16}>folder_special</MaterialIcon>
                            </span>
                            <div className="tree-node-label-wrapper">
                                <span className="tree-node-label">{coll.name}</span>
                                {coll.description && coll.description.trim() ? (
                                    <button
                                        type="button"
                                        className={`tree-info-icon-btn ${activeInfo?.id === coll._id ? "active" : ""}`}
                                        onClick={(e) =>
                                            handleInfoClick(e, {
                                                id: coll._id,
                                                name: coll.name,
                                                type: "Collection",
                                                description: coll.description,
                                            })
                                        }
                                        title="View collection description"
                                        aria-label={`View description for "${coll.name}"`}
                                    >
                                        <MaterialIcon size={14}>info_outline</MaterialIcon>
                                    </button>
                                ) : null}
                            </div>
                            <span className="tree-count-badge">{totalReqCount}</span>

                            <div className="tree-actions-group">
                                <button
                                    type="button"
                                    className="tree-action-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedCollections((prev) => ({ ...prev, [coll._id]: true }));
                                        onNewRequestInScope(coll._id, null);
                                    }}
                                    title={`Add new request to "${coll.name}"`}
                                    aria-label={`Add new request to "${coll.name}"`}
                                >
                                    <MaterialIcon size={16}>add</MaterialIcon>
                                </button>
                                <button
                                    type="button"
                                    className="tree-action-btn"
                                    onClick={(e) =>
                                        handleMenuClick(e, {
                                            type: "collection",
                                            id: coll._id,
                                            item: coll,
                                        })
                                    }
                                    title="Collection options"
                                    aria-label="Collection options"
                                >
                                    <MaterialIcon size={16}>more_vert</MaterialIcon>
                                </button>
                            </div>
                        </div>

                        {/* Collection Context Menu (portal) */}
                        {activeMenu?.type === "collection" && activeMenu.id === coll._id && (
                            <ContextMenu anchorEl={activeMenu.anchorEl} onClose={closeMenu}>
                                <button
                                    type="button"
                                    className="dropdown-action-item"
                                    onClick={() => { closeMenu(); onOpenFolderModal(coll._id, coll.name); }}
                                >
                                    <MaterialIcon size={15}>create_new_folder</MaterialIcon>
                                    <span>Add Folder</span>
                                </button>
                                <button
                                    type="button"
                                    className="dropdown-action-item"
                                    onClick={() => {
                                        closeMenu();
                                        setExpandedCollections((prev) => ({ ...prev, [coll._id]: true }));
                                        onNewRequestInScope(coll._id, null);
                                    }}
                                >
                                    <MaterialIcon size={15}>add</MaterialIcon>
                                    <span>Add Request</span>
                                </button>
                                <button
                                    type="button"
                                    className="dropdown-action-item"
                                    onClick={() => { closeMenu(); onOpenCollectionModal(coll); }}
                                >
                                    <MaterialIcon size={15}>edit</MaterialIcon>
                                    <span>Rename Collection</span>
                                </button>
                                <button
                                    type="button"
                                    className="dropdown-action-item"
                                    onClick={() => { closeMenu(); onDuplicateCollection(coll._id); }}
                                >
                                    <MaterialIcon size={15}>content_copy</MaterialIcon>
                                    <span>Duplicate Collection</span>
                                </button>
                                <div className="dropdown-divider" />
                                <button
                                    type="button"
                                    className="dropdown-action-item danger"
                                    onClick={() => { closeMenu(); onDeleteCollection(coll._id, coll.name); }}
                                >
                                    <MaterialIcon size={15}>delete</MaterialIcon>
                                    <span>Delete Collection</span>
                                </button>
                            </ContextMenu>
                        )}

                        {/* Collection Body: Folders & Root Requests */}
                        {isCollExpanded && (
                            <div className="tree-collection-children">
                                {/* Folders */}
                                {matchingFolders.map((folder) => {
                                    const isFolderExpanded = expandedFolders[folder._id] ?? true;
                                    const fRequests = folder.requests || [];
                                    const matchingFReqs = fRequests.filter(
                                        (r) =>
                                            !q ||
                                            collMatches ||
                                            folder.name.toLowerCase().includes(q) ||
                                            r.name.toLowerCase().includes(q) ||
                                            r.url.toLowerCase().includes(q) ||
                                            r.method.toLowerCase().includes(q),
                                    );

                                    return (
                                        <div key={folder._id} className="tree-folder-node">
                                            {/* Folder Header Row */}
                                            <div
                                                className={`tree-node-row tree-folder-header ${activeScopeId === folder._id ? "active-scope" : ""}`}
                                                onClick={(e) => {
                                                    toggleFolder(folder._id, e);
                                                    if (onScopeChange) {
                                                        onScopeChange({ type: "folder", id: folder._id, collectionId: coll._id, folderId: folder._id, name: folder.name });
                                                    }
                                                }}
                                                title={folder.description || folder.name}
                                            >
                                                <span className="tree-expand-icon">
                                                    <MaterialIcon size={16}>
                                                        {isFolderExpanded ? "expand_more" : "chevron_right"}
                                                    </MaterialIcon>
                                                </span>
                                                <span className="tree-icon folder-icon">
                                                    <MaterialIcon size={16}>
                                                        {isFolderExpanded ? "folder_open" : "folder"}
                                                    </MaterialIcon>
                                                </span>
                                                <div className="tree-node-label-wrapper">
                                                    <span className="tree-node-label">{folder.name}</span>
                                                    {folder.description && folder.description.trim() ? (
                                                        <button
                                                            type="button"
                                                            className={`tree-info-icon-btn ${activeInfo?.id === folder._id ? "active" : ""}`}
                                                            onClick={(e) =>
                                                                handleInfoClick(e, {
                                                                    id: folder._id,
                                                                    name: folder.name,
                                                                    type: "Folder",
                                                                    description: folder.description,
                                                                })
                                                            }
                                                            title="View folder description"
                                                            aria-label={`View description for "${folder.name}"`}
                                                        >
                                                            <MaterialIcon size={14}>info_outline</MaterialIcon>
                                                        </button>
                                                    ) : null}
                                                </div>
                                                <span className="tree-count-badge">{fRequests.length}</span>

                                                <div className="tree-actions-group">
                                                    <button
                                                        type="button"
                                                        className="tree-action-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedCollections((prev) => ({ ...prev, [coll._id]: true }));
                                                            setExpandedFolders((prev) => ({ ...prev, [folder._id]: true }));
                                                            onNewRequestInScope(coll._id, folder._id);
                                                        }}
                                                        title={`Add new request to folder "${folder.name}"`}
                                                        aria-label={`Add new request to folder "${folder.name}"`}
                                                    >
                                                        <MaterialIcon size={16}>add</MaterialIcon>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="tree-action-btn"
                                                        onClick={(e) =>
                                                            handleMenuClick(e, {
                                                                type: "folder",
                                                                id: folder._id,
                                                                item: folder,
                                                                collectionId: coll._id,
                                                            })
                                                        }
                                                        title="Folder options"
                                                        aria-label="Folder options"
                                                    >
                                                        <MaterialIcon size={16}>more_vert</MaterialIcon>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Folder Context Menu (portal) */}
                                            {activeMenu?.type === "folder" && activeMenu.id === folder._id && (
                                                <ContextMenu anchorEl={activeMenu.anchorEl} onClose={closeMenu}>
                                                    <button
                                                        type="button"
                                                        className="dropdown-action-item"
                                                        onClick={() => {
                                                            closeMenu();
                                                            setExpandedCollections((prev) => ({ ...prev, [coll._id]: true }));
                                                            setExpandedFolders((prev) => ({ ...prev, [folder._id]: true }));
                                                            onNewRequestInScope(coll._id, folder._id);
                                                        }}
                                                    >
                                                        <MaterialIcon size={15}>add</MaterialIcon>
                                                        <span>Add Request to Folder</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="dropdown-action-item"
                                                        onClick={() => { closeMenu(); onOpenFolderModal(coll._id, coll.name, folder); }}
                                                    >
                                                        <MaterialIcon size={15}>edit</MaterialIcon>
                                                        <span>Rename Folder</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="dropdown-action-item"
                                                        onClick={() => { closeMenu(); onDuplicateFolder(coll._id, folder._id); }}
                                                    >
                                                        <MaterialIcon size={15}>content_copy</MaterialIcon>
                                                        <span>Duplicate Folder</span>
                                                    </button>
                                                    <div className="dropdown-divider" />
                                                    <button
                                                        type="button"
                                                        className="dropdown-action-item danger"
                                                        onClick={() => { closeMenu(); onDeleteFolder(coll._id, folder._id, folder.name); }}
                                                    >
                                                        <MaterialIcon size={15}>delete</MaterialIcon>
                                                        <span>Delete Folder</span>
                                                    </button>
                                                </ContextMenu>
                                            )}

                                            {/* Folder Requests */}
                                            {isFolderExpanded && (
                                                <div className="tree-folder-children">
                                                    {matchingFReqs.length === 0 ? (
                                                        <div className="tree-empty-hint">Empty folder</div>
                                                    ) : (
                                                        matchingFReqs.map((req) => (
                                                            <TreeRequestItem
                                                                key={req._id}
                                                                request={req}
                                                                isActive={activeRequestId === req._id}
                                                                onSelect={() => onSelectRequest(req)}
                                                                onMenuClick={(e) =>
                                                                    handleMenuClick(e, {
                                                                        type: "request",
                                                                        id: req._id,
                                                                        item: req,
                                                                    })
                                                                }
                                                                activeMenu={activeMenu}
                                                                onDuplicate={() => { closeMenu(); onDuplicateRequest(req._id); }}
                                                                onMove={() => { closeMenu(); onOpenMoveModal(req); }}
                                                                onDelete={() => { closeMenu(); onDeleteRequest(req._id, req.name); }}
                                                                closeMenu={closeMenu}
                                                            />
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Root Requests inside Collection */}
                                {matchingRootReqs.map((req) => (
                                    <TreeRequestItem
                                        key={req._id}
                                        request={req}
                                        isActive={activeRequestId === req._id}
                                        onSelect={() => onSelectRequest(req)}
                                        onMenuClick={(e) =>
                                            handleMenuClick(e, {
                                                type: "request",
                                                id: req._id,
                                                item: req,
                                            })
                                        }
                                        activeMenu={activeMenu}
                                        onDuplicate={() => { closeMenu(); onDuplicateRequest(req._id); }}
                                        onMove={() => { closeMenu(); onOpenMoveModal(req); }}
                                        onDelete={() => { closeMenu(); onDeleteRequest(req._id, req.name); }}
                                        closeMenu={closeMenu}
                                    />
                                ))}

                                {folders.length === 0 && rootRequests.length === 0 && (
                                    <div className="tree-empty-hint">Empty collection</div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {activeInfo && (
                <DescriptionPopover
                    info={activeInfo}
                    onClose={() => setActiveInfo(null)}
                />
            )}
        </div>
    );
}

function TreeRequestItem({
    request,
    isActive,
    onSelect,
    onMenuClick,
    activeMenu,
    onDuplicate,
    onMove,
    onDelete,
    closeMenu,
}) {
    const methodColor = METHOD_COLORS[request.method] || "#94a3b8";

    return (
        <div className="tree-request-wrapper">
            <div
                className={`tree-node-row tree-request-row ${isActive ? "active" : ""}`}
                onClick={onSelect}
                title={`${request.method} ${request.url}`}
            >
                <span
                    className="tree-method-badge"
                    style={{ color: methodColor, borderColor: `${methodColor}40`, backgroundColor: `${methodColor}15` }}
                >
                    {request.method}
                </span>
                <span className="tree-request-name">{request.name}</span>

                <div className="tree-actions-group">
                    <button
                        type="button"
                        className="tree-action-btn tree-action-delete"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        title={`Delete "${request.name}"`}
                        aria-label={`Delete "${request.name}"`}
                    >
                        <MaterialIcon size={14}>delete</MaterialIcon>
                    </button>
                    <button
                        type="button"
                        className="tree-action-btn"
                        onClick={onMenuClick}
                        title="Request options"
                        aria-label="Request options"
                    >
                        <MaterialIcon size={15}>more_vert</MaterialIcon>
                    </button>
                </div>
            </div>

            {activeMenu?.type === "request" && activeMenu.id === request._id && (
                <ContextMenu anchorEl={activeMenu.anchorEl} onClose={closeMenu}>
                    <button
                        type="button"
                        className="dropdown-action-item"
                        onClick={async () => {
                            closeMenu();
                            const newName = prompt("Rename request:", request.name);
                            if (newName && newName.trim() && newName.trim() !== request.name) {
                                try {
                                    await requestApi.update(request._id, { name: newName.trim() });
                                    if (onSelect) onSelect();
                                } catch (err) {
                                    alert(err.message || "Failed to rename request.");
                                }
                            }
                        }}
                    >
                        <MaterialIcon size={15}>edit</MaterialIcon>
                        <span>Rename Request</span>
                    </button>
                    <button type="button" className="dropdown-action-item" onClick={onDuplicate}>
                        <MaterialIcon size={15}>content_copy</MaterialIcon>
                        <span>Duplicate Request</span>
                    </button>
                    <button type="button" className="dropdown-action-item" onClick={onMove}>
                        <MaterialIcon size={15}>drive_file_move</MaterialIcon>
                        <span>Move to...</span>
                    </button>
                    <div className="dropdown-divider" />
                    <button type="button" className="dropdown-action-item danger" onClick={onDelete}>
                        <MaterialIcon size={15}>delete</MaterialIcon>
                        <span>Delete Request</span>
                    </button>
                </ContextMenu>
            )}
        </div>
    );
}
