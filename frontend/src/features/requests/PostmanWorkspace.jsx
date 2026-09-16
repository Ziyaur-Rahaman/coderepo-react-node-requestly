import React, { useState, useRef, useEffect, useCallback } from "react";
import { RequestSidebar } from "./RequestSidebar.jsx";
import { RequestBuilder } from "./RequestBuilder.jsx";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { ProfileAvatar } from "../profiles/ProfileAvatar.jsx";
import { ConfirmModal } from "../../shared/components/ConfirmModal.jsx";
import { readTheme, applyTheme } from "../../shared/utils/theme.js";
import { requestApi } from "./request.api.js";
import { environmentApi } from "../environments/environment.api.js";
import { EnvironmentSelector } from "../environments/EnvironmentSelector.jsx";
import { EnvironmentQuickLook } from "../environments/EnvironmentQuickLook.jsx";
import { EnvironmentModal } from "../environments/EnvironmentModal.jsx";
import { getNextUntitledName } from "./request-naming.js";

export function PostmanWorkspace({ activeProfile, activeWorkspace, onLogout, onSwitchProfile }) {
    const [theme, setTheme] = useState(readTheme);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [activeHistoryId, setActiveHistoryId] = useState(null);
    const [sidebarRefresh, setSidebarRefresh] = useState(0);
    const [historyRefresh, setHistoryRefresh] = useState(0);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const [deleteModal, setDeleteModal] = useState({
        open: false,
        requestId: null,
        requestName: "",
        loading: false,
    });

    // Environment state
    const [environments, setEnvironments] = useState([]);
    const [environmentsLoading, setEnvironmentsLoading] = useState(false);
    const [environmentsError, setEnvironmentsError] = useState("");
    const [activeEnvironmentId, setActiveEnvironmentId] = useState(() => {
        return localStorage.getItem("postman-active-env-id") || null;
    });
    const [environmentModal, setEnvironmentModal] = useState({ open: false, data: null });
    const [sidebarTab, setSidebarTab] = useState("collections");

    // Draggable / Resizable left sidebar state
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = localStorage.getItem("postman-sidebar-width");
        const parsed = parseInt(saved, 10);
        return !isNaN(parsed) && parsed >= 260 && parsed <= 700 ? parsed : 320;
    });
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const isResizingRef = useRef(false);

    const handleStartSidebarResize = useCallback((e) => {
        e.preventDefault();
        isResizingRef.current = true;
        setIsResizingSidebar(true);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        const handleMouseMove = (moveEvent) => {
            if (!isResizingRef.current) return;
            const newWidth = Math.max(260, Math.min(Math.round(window.innerWidth * 0.55), moveEvent.clientX));
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = (upEvent) => {
            if (!isResizingRef.current) return;
            isResizingRef.current = false;
            setIsResizingSidebar(false);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            const finalWidth = Math.max(260, Math.min(Math.round(window.innerWidth * 0.55), upEvent.clientX));
            setSidebarWidth(finalWidth);
            try {
                localStorage.setItem("postman-sidebar-width", String(finalWidth));
            } catch {}
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    }, []);

    const handleResetSidebarWidth = () => {
        setSidebarWidth(320);
        try {
            localStorage.setItem("postman-sidebar-width", "320");
        } catch {}
    };

    const handleKeyDownResize = (e) => {
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            setSidebarWidth((prev) => {
                const next = Math.max(260, prev - 15);
                localStorage.setItem("postman-sidebar-width", String(next));
                return next;
            });
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setSidebarWidth((prev) => {
                const next = Math.min(Math.round(window.innerWidth * 0.55), prev + 15);
                localStorage.setItem("postman-sidebar-width", String(next));
                return next;
            });
        }
    };

    const loadEnvironments = useCallback(async () => {
        try {
            setEnvironmentsLoading(true);
            setEnvironmentsError("");
            const list = await environmentApi.list();
            const envs = Array.isArray(list) ? list : [];
            setEnvironments(envs);

            setActiveEnvironmentId((currentId) => {
                if (currentId && envs.some((e) => e._id === currentId)) {
                    return currentId;
                }
                const defaultEnv = envs.find((e) => e.isDefault) || envs[0];
                const nextId = defaultEnv ? defaultEnv._id : null;
                if (nextId) {
                    localStorage.setItem("postman-active-env-id", nextId);
                } else {
                    localStorage.removeItem("postman-active-env-id");
                }
                return nextId;
            });
        } catch (err) {
            setEnvironmentsError(err.message || "Failed to load environments.");
        } finally {
            setEnvironmentsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEnvironments();
    }, [loadEnvironments, activeProfile?._id]);

    const handleSelectEnvironment = (envId) => {
        setActiveEnvironmentId(envId);
        if (envId) {
            localStorage.setItem("postman-active-env-id", envId);
        } else {
            localStorage.removeItem("postman-active-env-id");
        }
    };

    const handleOpenEnvironmentModal = (env = null) => {
        setEnvironmentModal({ open: true, data: env });
    };

    const handleSavedEnvironment = async (savedEnv) => {
        await loadEnvironments();
        if (savedEnv?._id) {
            handleSelectEnvironment(savedEnv._id);
        }
    };

    const handleDuplicateEnvironment = async (envId) => {
        try {
            const duplicated = await environmentApi.duplicate(envId);
            await loadEnvironments();
            if (duplicated?._id) {
                handleSelectEnvironment(duplicated._id);
            }
        } catch (err) {
            alert(err.message || "Failed to duplicate environment.");
        }
    };

    const handleDeleteEnvironment = async (envId) => {
        try {
            await environmentApi.delete(envId);
            if (activeEnvironmentId === envId) {
                handleSelectEnvironment(null);
            }
            await loadEnvironments();
        } catch (err) {
            alert(err.message || "Failed to delete environment.");
        }
    };

    const handleManageEnvironments = () => {
        setSidebarTab("environments");
    };

    const activeEnvironment = environments.find((e) => e._id === activeEnvironmentId) || null;

    // Load active request from localStorage or default on mount
    useEffect(() => {
        const activeId = localStorage.getItem("postman-active-request-id");
        if (activeId) {
            requestApi.get(activeId)
                .then((res) => {
                    if (res?.data) setSelectedRequest(res.data);
                    else if (res?._id) setSelectedRequest(res);
                })
                .catch(() => {
                    requestApi.list().then((res) => {
                        const list = res?.data || res || [];
                        if (list.length > 0) setSelectedRequest(list[0]);
                    }).catch(() => {});
                });
        } else {
            requestApi.list().then((res) => {
                const list = res?.data || res || [];
                if (list.length > 0) setSelectedRequest(list[0]);
            }).catch(() => {});
        }
    }, []);

    // Close profile menu when clicking outside
    useEffect(() => {
        if (!profileMenuOpen) return;
        const handleOutsideClick = (e) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
                setProfileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [profileMenuOpen]);

    const handleThemeChange = (nextTheme) => {
        applyTheme(nextTheme);
        setTheme(nextTheme);
    };

    const handleSelectRequest = (req) => {
        setSelectedRequest(req ? { ...req, initialResponse: null } : null);
        setActiveHistoryId(null);
        if (req?._id) {
            localStorage.setItem("postman-active-request-id", req._id);
        }
    };

    const handleNewRequestInScope = async (collectionId = null, folderId = null) => {
        if (!collectionId) {
            // Global new request created without selecting a collection/folder:
            // Calculate next untitled name in Uncategorized scope so the draft has the right display name
            let draftName = "Untitled Request";
            try {
                const listRes = await requestApi.list();
                const allRequests = Array.isArray(listRes) ? listRes : (listRes?.data || []);
                const uncategorized = allRequests.filter((r) => !r.collectionId && !r.folderId);
                draftName = getNextUntitledName(uncategorized.map((r) => r.name));
            } catch {
                // fallback
            }

            const draftRequest = {
                _id: null,
                name: draftName,
                method: "GET",
                url: "http://localhost:8000/api/v1/health",
                queryParams: [{ key: "", value: "", description: "", enabled: true }],
                headers: [
                    { key: "Accept", value: "application/json", description: "", enabled: true },
                    { key: "", value: "", description: "", enabled: true },
                ],
                bodyType: "none",
                bodyContent: "",
                auth: { type: "none", config: {} },
                collectionId: null,
                folderId: null,
                initialResponse: null,
            };

            setSelectedRequest(draftRequest);
            setActiveHistoryId(null);
            localStorage.removeItem("postman-active-request-id");
            return draftRequest;
        }

        // When clicked beside a collection or folder: persist immediately inside that collection or folder
        try {
            const newReqPayload = {
                method: "GET",
                url: "http://localhost:8000/api/v1/health",
                queryParams: [{ key: "", value: "", description: "", enabled: true }],
                headers: [
                    { key: "Accept", value: "application/json", description: "", enabled: true },
                    { key: "", value: "", description: "", enabled: true },
                ],
                bodyType: "none",
                bodyContent: "",
                auth: { type: "none", config: {} },
                collectionId,
                folderId: folderId || null,
            };

            const created = await requestApi.create(newReqPayload);
            const savedItem = created?.data || created;
            setSelectedRequest(savedItem);
            setActiveHistoryId(null);
            if (savedItem?._id) {
                localStorage.setItem("postman-active-request-id", savedItem._id);
            }
            setSidebarRefresh((prev) => prev + 1);
            return savedItem;
        } catch (err) {
            console.error("Creating request inside collection/folder failed:", err);
            const fallbackDraft = {
                _id: null,
                name: "Untitled Request",
                method: "GET",
                url: "http://localhost:8000/api/v1/health",
                queryParams: [{ key: "", value: "", description: "", enabled: true }],
                headers: [
                    { key: "Accept", value: "application/json", description: "", enabled: true },
                    { key: "", value: "", description: "", enabled: true },
                ],
                bodyType: "none",
                bodyContent: "",
                auth: { type: "none", config: {} },
                collectionId,
                folderId: folderId || null,
                initialResponse: null,
            };
            setSelectedRequest(fallbackDraft);
            setActiveHistoryId(null);
            return fallbackDraft;
        }
    };

    const handleNewRequest = () => {
        handleNewRequestInScope(null, null);
    };

    const handleDeleteRequest = (requestId, requestName) => {
        setDeleteModal({
            open: true,
            requestId,
            requestName: requestName || "Untitled Request",
            loading: false,
        });
    };

    const handleConfirmDeleteRequest = async () => {
        const { requestId } = deleteModal;
        if (!requestId) return;
        setDeleteModal((prev) => ({ ...prev, loading: true }));
        try {
            await requestApi.remove(requestId);
            setDeleteModal({ open: false, requestId: null, requestName: "", loading: false });

            // If deleting the active request, select the next available or reset to draft without creating DB record
            if (selectedRequest?._id === requestId) {
                localStorage.removeItem("postman-active-request-id");
                try {
                    const tree = await requestApi.list();
                    const list = Array.isArray(tree) ? tree : (tree?.data || []);
                    const remaining = list.filter((r) => r._id !== requestId);
                    if (remaining.length > 0) {
                        setSelectedRequest(remaining[0]);
                        localStorage.setItem("postman-active-request-id", remaining[0]._id);
                    } else {
                        // Reset to clean in-memory draft (do NOT create in MongoDB)
                        setSelectedRequest({
                            _id: null,
                            name: "Untitled Request",
                            method: "GET",
                            url: "http://localhost:8000/api/v1/health",
                            queryParams: [{ key: "", value: "", description: "", enabled: true }],
                            headers: [
                                { key: "Accept", value: "application/json", description: "", enabled: true },
                                { key: "", value: "", description: "", enabled: true },
                            ],
                            bodyType: "none",
                            bodyContent: "",
                            collectionId: null,
                            folderId: null,
                        });
                    }
                } catch {
                    setSelectedRequest(null);
                }
            }
            setSidebarRefresh((prev) => prev + 1);
        } catch (err) {
            alert(err.message || "Failed to delete request.");
            setDeleteModal((prev) => ({ ...prev, loading: false }));
        }
    };

    const handleSelectHistory = (historyItem) => {
        setActiveHistoryId(historyItem._id);
        setSelectedRequest({
            _id: historyItem.requestId || null,
            name: historyItem.name || "Untitled Request",
            method: historyItem.request?.method || "GET",
            url: historyItem.request?.url || "",
            queryParams: historyItem.request?.queryParams?.length
                ? historyItem.request.queryParams
                : [{ key: "", value: "", description: "", enabled: true }],
            headers: historyItem.request?.headers?.length
                ? historyItem.request.headers
                : [{ key: "", value: "", description: "", enabled: true }],
            bodyType: historyItem.request?.bodyType || "none",
            bodyContent: historyItem.request?.bodyContent || "",
            collectionId: historyItem.collectionId || null,
            folderId: historyItem.folderId || null,
            initialResponse: historyItem.response || null,
            historyId: historyItem._id,
        });
        if (historyItem.requestId) {
            localStorage.setItem("postman-active-request-id", historyItem.requestId);
        }
    };

    const handleSaveHistoryToCollection = (historyItem) => {
        setActiveHistoryId(historyItem._id);
        setSelectedRequest({
            _id: null, // Clear ID so save creates a new request in collection
            name:
                historyItem.name && historyItem.name !== "Untitled Request"
                    ? historyItem.name
                    : `${historyItem.request?.method || "GET"} ${historyItem.request?.url?.replace(/^https?:\/\//i, "") || ""}`,
            method: historyItem.request?.method || "GET",
            url: historyItem.request?.url || "",
            queryParams: historyItem.request?.queryParams?.length
                ? historyItem.request.queryParams
                : [{ key: "", value: "", description: "", enabled: true }],
            headers: historyItem.request?.headers?.length
                ? historyItem.request.headers
                : [{ key: "", value: "", description: "", enabled: true }],
            bodyType: historyItem.request?.bodyType || "none",
            bodyContent: historyItem.request?.bodyContent || "",
            collectionId: historyItem.collectionId || null,
            folderId: historyItem.folderId || null,
            initialResponse: historyItem.response || null,
            autoOpenSaveModal: true,
        });
    };

    const handleSendAdhocHealthCheck = () => {
        setSelectedRequest({
            _id: null,
            name: "System Health Check",
            method: "GET",
            url: "http://localhost:8000/api/v1/health",
            queryParams: [{ key: "", value: "", description: "", enabled: true }],
            headers: [
                { key: "Accept", value: "application/json", description: "", enabled: true },
            ],
            bodyType: "none",
            bodyContent: "",
            collectionId: null,
            folderId: null,
        });
        setActiveHistoryId(null);
    };

    const handleSavedRequestUpdated = (saved) => {
        if (saved?._id) {
            setSelectedRequest(saved);
            localStorage.setItem("postman-active-request-id", saved._id);
        }
        setSidebarRefresh((prev) => prev + 1);
    };

    const handleHistoryUpdated = () => {
        setHistoryRefresh((prev) => prev + 1);
    };

    return (
        <div className="postman-shell">
            <header className="postman-header">
                <div className="postman-header-brand">
                    <span className="postman-logo-icon">R</span>
                    <span>Requestly</span>
                    {activeWorkspace && (
                        <span
                            className="header-workspace-pill"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "3px 10px",
                                borderRadius: "6px",
                                background: "var(--surface-muted)",
                                border: "1px solid var(--border)",
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "var(--ink-strong)",
                                marginLeft: "8px",
                            }}
                        >
                            <span>{activeWorkspace.name}</span>
                        </span>
                    )}
                </div>

                {/* Environment Selector & Quick Look Bar */}
                <div className="header-environments-bar">
                    <EnvironmentSelector
                        environments={environments}
                        activeEnvironmentId={activeEnvironmentId}
                        onSelectEnvironment={handleSelectEnvironment}
                        onCreateEnvironment={() => handleOpenEnvironmentModal(null)}
                        onManageEnvironments={handleManageEnvironments}
                        loading={environmentsLoading}
                    />
                    <EnvironmentQuickLook
                        activeEnvironment={activeEnvironment}
                        onEditEnvironment={handleOpenEnvironmentModal}
                        onCreateEnvironment={() => handleOpenEnvironmentModal(null)}
                    />
                </div>

                <div className="header-actions">
                    <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleThemeChange(theme === "dark" ? "light" : "dark")}
                        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                        aria-label="Toggle theme"
                    >
                        <MaterialIcon size={20}>
                            {theme === "dark" ? "light_mode" : "dark_mode"}
                        </MaterialIcon>
                    </button>

                    {/* Rich Material Profile Menu Anchor */}
                    <div className="profile-menu-anchor" ref={profileMenuRef}>
                        <button
                            type="button"
                            className="postman-profile-pill"
                            onClick={() => setProfileMenuOpen((prev) => !prev)}
                            aria-expanded={profileMenuOpen}
                            aria-haspopup="menu"
                            aria-label={`${activeProfile?.name} profile menu`}
                        >
                            <ProfileAvatar profile={activeProfile} size="small" />
                            <span className="postman-profile-pill-name">{activeWorkspace?.name || activeProfile?.name}</span>
                            <MaterialIcon size={18} className="postman-profile-pill-arrow">
                                expand_more
                            </MaterialIcon>
                        </button>

                        {profileMenuOpen && (
                            <div className="profile-menu" role="menu" aria-label="Profile menu">
                                <div className="profile-menu-identity">
                                    <span className="profile-menu-label">CURRENT WORKSPACE</span>
                                    <ProfileAvatar profile={activeProfile} size="medium" />
                                    <strong>{activeWorkspace?.name || activeProfile?.name}</strong>
                                    <span>{activeProfile?.email}</span>
                                </div>

                                <div className="profile-menu-appearance" role="group" aria-label="Appearance">
                                    <span>Appearance</span>
                                    <div className="theme-toggle">
                                        {[
                                            { value: "light", label: "Light", icon: "light_mode" },
                                            { value: "dark", label: "Dark", icon: "dark_mode" },
                                        ].map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                aria-pressed={theme === option.value}
                                                onClick={() => handleThemeChange(option.value)}
                                            >
                                                <MaterialIcon size={17}>{option.icon}</MaterialIcon>
                                                <span>{option.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="profile-switch-button"
                                    role="menuitem"
                                    onClick={() => {
                                        setProfileMenuOpen(false);
                                        onSwitchProfile();
                                    }}
                                >
                                    <span className="profile-switch-icon">
                                        <MaterialIcon size={20}>workspaces</MaterialIcon>
                                    </span>
                                    <span>
                                        <strong>Switch workspace</strong>
                                        <small>Choose or create a workspace</small>
                                    </span>
                                    <MaterialIcon size={18}>chevron_right</MaterialIcon>
                                </button>

                                <button
                                    type="button"
                                    className="profile-signout-button"
                                    role="menuitem"
                                    onClick={() => {
                                        setProfileMenuOpen(false);
                                        onLogout();
                                    }}
                                >
                                    <MaterialIcon size={18}>logout</MaterialIcon>
                                    <span>Sign out</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className={`postman-workspace-area ${isResizingSidebar ? "is-resizing-sidebar" : ""}`}>
                <aside
                    className="postman-sidebar-wrapper"
                    style={{ width: `${sidebarWidth}px`, flexShrink: 0 }}
                    aria-label="Workspace Sidebar"
                >
                    <RequestSidebar
                        activeRequestId={selectedRequest?._id}
                        activeHistoryId={activeHistoryId}
                        onSelectRequest={handleSelectRequest}
                        onSelectHistory={handleSelectHistory}
                        onSaveHistoryToCollection={handleSaveHistoryToCollection}
                        onNewRequest={handleNewRequest}
                        onNewRequestInScope={handleNewRequestInScope}
                        onSendAdhocHealthCheck={handleSendAdhocHealthCheck}
                        onDeleteRequest={handleDeleteRequest}
                        refreshTrigger={sidebarRefresh}
                        historyRefreshTrigger={historyRefresh}
                        environments={environments}
                        activeEnvironmentId={activeEnvironmentId}
                        onSelectEnvironment={handleSelectEnvironment}
                        onCreateEnvironment={() => handleOpenEnvironmentModal(null)}
                        onEditEnvironment={handleOpenEnvironmentModal}
                        onDuplicateEnvironment={handleDuplicateEnvironment}
                        onDeleteEnvironment={handleDeleteEnvironment}
                        environmentsLoading={environmentsLoading}
                        environmentsError={environmentsError}
                        onRefreshEnvironments={loadEnvironments}
                        sidebarTab={sidebarTab}
                        onTabChange={setSidebarTab}
                    />
                </aside>

                <div
                    className={`sidebar-resize-handle ${isResizingSidebar ? "resizing" : ""}`}
                    onMouseDown={handleStartSidebarResize}
                    onDoubleClick={handleResetSidebarWidth}
                    onKeyDown={handleKeyDownResize}
                    tabIndex={0}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Sidebar resize handle. Drag or use left and right arrow keys to resize."
                    aria-valuenow={sidebarWidth}
                    aria-valuemin={260}
                    aria-valuemax={Math.round(window.innerWidth * 0.55)}
                    title="Drag to resize sidebar (double-click to reset to 320px)"
                />

                <main className="postman-main-content">
                    <RequestBuilder
                        key={selectedRequest?._id || selectedRequest?.historyId || "new-request"}
                        initialRequest={selectedRequest}
                        activeEnvironment={activeEnvironment}
                        onSavedRequestUpdated={handleSavedRequestUpdated}
                        onHistoryUpdated={handleHistoryUpdated}
                        onDeleteRequest={handleDeleteRequest}
                    />
                </main>
            </div>

            {/* In-app Delete Confirmation Modal */}
            <ConfirmModal
                open={deleteModal.open}
                title="Delete Request"
                message={`Are you sure you want to delete "${deleteModal.requestName}"? This request will be permanently removed.`}
                confirmLabel="Delete"
                confirmVariant="danger"
                loading={deleteModal.loading}
                onConfirm={handleConfirmDeleteRequest}
                onClose={() => setDeleteModal({ open: false, requestId: null, requestName: "", loading: false })}
            />

            {/* Environment Manager Modal */}
            <EnvironmentModal
                open={environmentModal.open}
                environment={environmentModal.data}
                onClose={() => setEnvironmentModal({ open: false, data: null })}
                onSaved={handleSavedEnvironment}
            />
        </div>
    );
}
