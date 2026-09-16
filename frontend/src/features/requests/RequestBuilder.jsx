import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { RequestUrlBar } from "./RequestUrlBar.jsx";
import { RequestBodyEditor } from "./RequestBodyEditor.jsx";
import { ResponseViewer } from "./ResponseViewer.jsx";
import { SaveRequestModal } from "./SaveRequestModal.jsx";
import { KeyValueTable } from "../../shared/components/KeyValueTable.jsx";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { requestApi } from "./request.api.js";
import { collectionApi } from "../collections/collection.api.js";
import {
    buildVariablesMap,
    resolveString,
    extractVariableNames,
    hasVariables,
} from "../environments/variable-resolver.js";
import { RequestAuthEditor } from "./RequestAuthEditor.jsx";
import { CodeSnippetModal } from "./CodeSnippetModal.jsx";
import { ImportCurlModal } from "./ImportCurlModal.jsx";

const REQUEST_TABS = [
    { id: "params", label: "Params" },
    { id: "auth", label: "Auth" },
    { id: "headers", label: "Headers" },
    { id: "body", label: "Body" },
    { id: "settings", label: "Settings" },
];

export function RequestBuilder({
    initialRequest,
    activeEnvironment,
    onSavedRequestUpdated,
    onHistoryUpdated,
    onDeleteRequest,
}) {
    const [method, setMethod] = useState(initialRequest?.method || "GET");
    const [url, setUrl] = useState(initialRequest?.url || "http://localhost:8000/api/v1/health");

    // Environment variables map and resolution preview
    const activeVariablesMap = useMemo(() => {
        return buildVariablesMap(activeEnvironment?.variables || []);
    }, [activeEnvironment]);

    const urlHasVariables = hasVariables(url);
    const resolvedUrlPreview = useMemo(() => {
        if (!urlHasVariables) return null;
        return resolveString(url, activeVariablesMap);
    }, [url, urlHasVariables, activeVariablesMap]);

    const referencedVars = useMemo(() => {
        if (!urlHasVariables) return [];
        return extractVariableNames(url);
    }, [url, urlHasVariables]);

    const unresolvedVars = useMemo(() => {
        return referencedVars.filter(
            (v) => !Object.prototype.hasOwnProperty.call(activeVariablesMap, v)
        );
    }, [referencedVars, activeVariablesMap]);
    const [queryParams, setQueryParams] = useState(initialRequest?.queryParams || [{ key: "", value: "", description: "", enabled: true }]);
    const [headers, setHeaders] = useState(
        initialRequest?.headers || [
            { key: "Accept", value: "application/json", description: "Accept JSON format", enabled: true },
            { key: "", value: "", description: "", enabled: true },
        ],
    );
    const [bodyType, setBodyType] = useState(initialRequest?.bodyType || "none");
    const [bodyContent, setBodyContent] = useState(initialRequest?.bodyContent || "");
    const [auth, setAuth] = useState(
        initialRequest?.auth || initialRequest?.request?.auth || { type: "none", config: {} }
    );
    const [timeoutMs, setTimeoutMs] = useState(30000);

    const [activeTab, setActiveTab] = useState("params");
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [codeModalOpen, setCodeModalOpen] = useState(false);
    const [importCurlModalOpen, setImportCurlModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleImportCurl = (parsed) => {
        if (!parsed) return;
        setMethod(parsed.method || "GET");
        setUrl(parsed.url || "");
        setQueryParams(parsed.queryParams?.length ? parsed.queryParams : [{ key: "", value: "", description: "", enabled: true }]);
        setHeaders(parsed.headers?.length ? parsed.headers : [{ key: "", value: "", description: "", enabled: true }]);
        setBodyType(parsed.bodyType || "none");
        setBodyContent(parsed.bodyContent || "");
        setAuth(parsed.auth || { type: "none", config: {} });
        setRequestName(parsed.requestName || "Imported Request");
        setTitleInput(parsed.requestName || "Imported Request");
        setIsEditingTitle(false);
        setSavedId(null);
        setResponse(null);
        setError("");

        if (parsed.bodyType && parsed.bodyType !== "none") {
            setActiveTab("body");
        } else if (parsed.auth && parsed.auth.type !== "none") {
            setActiveTab("auth");
        } else if (parsed.queryParams && parsed.queryParams.filter((p) => p.enabled && p.key).length > 0) {
            setActiveTab("params");
        } else if (parsed.headers && parsed.headers.filter((h) => h.enabled && h.key).length > 0) {
            setActiveTab("headers");
        }
    };
    const [savedId, setSavedId] = useState(initialRequest?._id || null);
    const [requestName, setRequestName] = useState(initialRequest?.name || "Untitled Request");
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState(initialRequest?.name || "Untitled Request");
    const titleInputRef = useRef(null);
    const [collectionId, setCollectionId] = useState(initialRequest?.collectionId || null);
    const [folderId, setFolderId] = useState(initialRequest?.folderId || null);
    const [collections, setCollections] = useState([]);
    const [collectionsLoading, setCollectionsLoading] = useState(false);

    const refreshCollections = useCallback(() => {
        setCollectionsLoading(true);
        collectionApi.tree().then((data) => {
            if (data?.collections) setCollections(data.collections);
        }).catch(() => {}).finally(() => setCollectionsLoading(false));
    }, []);

    // Fetch on mount
    useEffect(() => { refreshCollections(); }, [refreshCollections]);


    // Execution state
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [error, setError] = useState("");
    const abortControllerRef = useRef(null);
    const layoutRef = useRef(null);

    // Resizable response panel height state
    const [responseHeight, setResponseHeight] = useState(() => {
        const saved = localStorage.getItem("postman-response-height");
        const parsed = Number(saved);
        return parsed && parsed >= 140 && parsed <= 1200 ? parsed : 440;
    });
    const [isDragging, setIsDragging] = useState(false);

    const handleResizePointerDown = (e) => {
        if (e.button !== 0) return; // Only primary mouse button
        e.preventDefault();
        e.stopPropagation();

        const handleEl = e.currentTarget;
        try {
            handleEl.setPointerCapture(e.pointerId);
        } catch {}
        setIsDragging(true);

        const startY = e.clientY;
        const startH = responseHeight;
        const containerH = layoutRef.current ? layoutRef.current.clientHeight : window.innerHeight;

        const handlePointerMove = (moveEvent) => {
            moveEvent.preventDefault();
            // Dragging UP increases response height, dragging DOWN decreases response height
            const deltaY = startY - moveEvent.clientY;
            const minH = 140;
            const maxH = Math.max(minH, containerH - 180);
            const newHeight = Math.min(maxH, Math.max(minH, startH + deltaY));
            setResponseHeight(newHeight);
            localStorage.setItem("postman-response-height", String(Math.round(newHeight)));
        };

        const handlePointerUp = (upEvent) => {
            setIsDragging(false);
            try {
                handleEl.releasePointerCapture(upEvent.pointerId);
            } catch {}
            handleEl.removeEventListener("pointermove", handlePointerMove);
            handleEl.removeEventListener("pointerup", handlePointerUp);
            handleEl.removeEventListener("pointercancel", handlePointerUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        document.body.style.cursor = "row-resize";
        document.body.style.userSelect = "none";
        handleEl.addEventListener("pointermove", handlePointerMove);
        handleEl.addEventListener("pointerup", handlePointerUp);
        handleEl.addEventListener("pointercancel", handlePointerUp);
    };

    const handleResizeDoubleClick = () => {
        const nextH = responseHeight > 500 ? 360 : 600;
        setResponseHeight(nextH);
        localStorage.setItem("postman-response-height", String(nextH));
    };

    // Sync state when initialRequest changes (e.g. user selected another request or history entry)
    useEffect(() => {
        if (initialRequest) {
            setMethod(initialRequest.method || "GET");
            setUrl(initialRequest.url || "");
            setQueryParams(initialRequest.queryParams?.length ? initialRequest.queryParams : [{ key: "", value: "", description: "", enabled: true }]);
            setHeaders(initialRequest.headers?.length ? initialRequest.headers : [{ key: "", value: "", description: "", enabled: true }]);
            setBodyType(initialRequest.bodyType || "none");
            setBodyContent(initialRequest.bodyContent || "");
            setAuth(initialRequest.auth || initialRequest.request?.auth || { type: "none", config: {} });
            setRequestName(initialRequest.name || "Untitled Request");
            setTitleInput(initialRequest.name || "Untitled Request");
            setIsEditingTitle(false);
            setSavedId(initialRequest._id || null);
            setCollectionId(initialRequest.collectionId || null);
            setFolderId(initialRequest.folderId || null);
            setResponse(initialRequest.initialResponse || null);
            setError("");
            if (initialRequest.autoOpenSaveModal) {
                setSaveModalOpen(true);
            }
        }
    }, [initialRequest]);

    // Two-way synchronization: when queryParams change, update URL
    const isInternalUrlUpdateRef = useRef(false);
    const isInternalParamsUpdateRef = useRef(false);

    const handleQueryParamsChange = (newParams) => {
        setQueryParams(newParams);
        if (isInternalParamsUpdateRef.current) return;

        isInternalUrlUpdateRef.current = true;
        try {
            // Parse current URL
            let base = url;
            const qIdx = url.indexOf("?");
            if (qIdx !== -1) {
                base = url.substring(0, qIdx);
            }

            const activeParams = newParams.filter((p) => p.enabled && p.key);
            if (activeParams.length === 0) {
                setUrl(base);
            } else {
                const searchParams = new URLSearchParams();
                activeParams.forEach((p) => searchParams.append(p.key, p.value || ""));
                setUrl(`${base}?${searchParams.toString()}`);
            }
        } catch {}
        setTimeout(() => {
            isInternalUrlUpdateRef.current = false;
        }, 50);
    };

    // When URL is edited directly, parse query string into queryParams
    const handleUrlChange = (newUrl) => {
        setUrl(newUrl);
        if (isInternalUrlUpdateRef.current) return;

        isInternalParamsUpdateRef.current = true;
        try {
            const qIdx = newUrl.indexOf("?");
            if (qIdx !== -1) {
                const searchStr = newUrl.substring(qIdx + 1);
                const searchParams = new URLSearchParams(searchStr);
                const extracted = [];
                searchParams.forEach((val, key) => {
                    extracted.push({ key, value: val, description: "", enabled: true });
                });
                extracted.push({ key: "", value: "", description: "", enabled: true });
                setQueryParams(extracted);
            }
        } catch {}
        setTimeout(() => {
            isInternalParamsUpdateRef.current = false;
        }, 50);
    };

    // Send request handler
    const handleSend = async () => {
        if (!url.trim()) return;
        setLoading(true);
        setError("");
        setResponse(null);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const payload = {
                method,
                url,
                queryParams: queryParams.filter((p) => p.enabled && p.key),
                headers: headers.filter((h) => h.enabled && h.key),
                bodyType,
                bodyContent,
                auth,
                timeoutMs,
                requestId: savedId || null,
                name: requestName || "Untitled Request",
                collectionId: collectionId || null,
                folderId: folderId || null,
                environmentId: activeEnvironment?._id || null,
            };

            const result = await requestApi.send(payload);
            setResponse(result);
            if (onHistoryUpdated) {
                onHistoryUpdated();
            }
        } catch (err) {
            setError(err.message || "Failed to dispatch request.");
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    // Cancel request handler
    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setLoading(false);
        setError("Request canceled by user.");
    };

    // Save request handler
    const handleSaveConfirm = async (saveData) => {
        setSaving(true);
        try {
            const name = typeof saveData === "string" ? saveData : saveData.name;
            const targetCollectionId = typeof saveData === "object" ? saveData.collectionId : collectionId;
            const targetFolderId = typeof saveData === "object" ? saveData.folderId : folderId;

            const isCustomName = typeof saveData === "object" ? saveData.isCustomName : true;
            const data = {
                name,
                isCustomName,
                method,
                url,
                queryParams,
                headers,
                bodyType,
                bodyContent,
                auth,
                collectionId: targetCollectionId,
                folderId: targetFolderId,
            };

            let saved;
            if (savedId) {
                saved = await requestApi.update(savedId, data);
            } else {
                saved = await requestApi.create(data);
                setSavedId(saved._id);
            }
            const actualName = saved?.name || name;
            setRequestName(actualName);
            setTitleInput(actualName);
            setCollectionId(targetCollectionId);
            setFolderId(targetFolderId);
            setSaveModalOpen(false);
            if (onSavedRequestUpdated) onSavedRequestUpdated(saved);
        } catch (err) {
            alert(err.message || "Failed to save request.");
        } finally {
            setSaving(false);
        }
    };

    const handleTitleSubmit = async () => {
        setIsEditingTitle(false);
        const trimmed = titleInput.trim() || "Untitled Request";
        if (trimmed === requestName) {
            setTitleInput(requestName);
            return;
        }
        setRequestName(trimmed);
        if (savedId) {
            try {
                await requestApi.update(savedId, { name: trimmed });
                if (onSavedRequestUpdated) onSavedRequestUpdated({ ...initialRequest, name: trimmed, _id: savedId });
            } catch (err) {
                console.error("Failed to rename request:", err);
                alert(err.message || "Failed to rename request.");
            }
        }
    };

    const handleDeleteCurrent = async () => {
        if (!savedId) return;
        if (onDeleteRequest) {
            await onDeleteRequest(savedId, requestName);
        }
    };

    const activeParamCount = queryParams.filter((p) => p.enabled && p.key).length;
    const activeHeaderCount = headers.filter((h) => h.enabled && h.key).length;

    const currentCollection = collections.find((c) => c._id === collectionId);
    const currentFolder = currentCollection?.folders?.find((f) => f._id === folderId);

    return (
        <div className="request-builder-layout" ref={layoutRef}>
            <div className="request-builder-top-section">
                <div className="request-builder-header">
                    <div className="request-identity">
                        {currentCollection && (
                            <div className="request-breadcrumb">
                                <span className="breadcrumb-coll">
                                    <MaterialIcon size={14}>folder_special</MaterialIcon>
                                    <span>{currentCollection.name}</span>
                                </span>
                                {currentFolder && (
                                    <>
                                        <span className="breadcrumb-separator">/</span>
                                        <span className="breadcrumb-folder">
                                            <MaterialIcon size={14}>folder</MaterialIcon>
                                            <span>{currentFolder.name}</span>
                                        </span>
                                    </>
                                )}
                                <span className="breadcrumb-separator">/</span>
                                <span
                                    className="breadcrumb-request-link"
                                    onClick={() => {
                                        setTitleInput(requestName);
                                        setIsEditingTitle(true);
                                    }}
                                    title="Click to rename request"
                                >
                                    {requestName}
                                </span>
                            </div>
                        )}
                        <div className="request-title-row">
                            <span className={`method-badge-header method-badge-${method.toLowerCase()}`}>
                                {method}
                            </span>
                            {isEditingTitle ? (
                                <div className="title-edit-container">
                                    <input
                                        ref={titleInputRef}
                                        type="text"
                                        className="request-title-input"
                                        value={titleInput}
                                        onChange={(e) => setTitleInput(e.target.value)}
                                        onBlur={handleTitleSubmit}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleTitleSubmit();
                                            if (e.key === "Escape") {
                                                setTitleInput(requestName);
                                                setIsEditingTitle(false);
                                            }
                                        }}
                                        autoFocus
                                        placeholder="Enter request name..."
                                    />
                                    <button
                                        type="button"
                                        className="title-edit-save-btn"
                                        onClick={handleTitleSubmit}
                                        title="Save name"
                                    >
                                        <MaterialIcon size={14}>check</MaterialIcon>
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className="request-title-clickable"
                                    onClick={() => {
                                        setTitleInput(requestName);
                                        setIsEditingTitle(true);
                                    }}
                                    title="Click to rename request"
                                >
                                    <h2 className="request-title">{requestName}</h2>
                                    <span className="edit-indicator-icon" title="Rename request">
                                        <MaterialIcon size={15}>edit</MaterialIcon>
                                    </span>
                                </div>
                            )}
                            {savedId && <span className="saved-badge">Saved</span>}
                            {savedId && (
                                <button
                                    type="button"
                                    className="btn-header-delete-request"
                                    onClick={handleDeleteCurrent}
                                    title="Delete this request"
                                >
                                    <MaterialIcon size={15}>delete</MaterialIcon>
                                    <span>Delete</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <RequestUrlBar
                    method={method}
                    onMethodChange={setMethod}
                    url={url}
                    onUrlChange={handleUrlChange}
                    onSend={handleSend}
                    onCancel={handleCancel}
                    loading={loading}
                    onSave={() => { refreshCollections(); setSaveModalOpen(true); }}
                    isSaved={Boolean(savedId)}
                    onOpenCode={() => setCodeModalOpen(true)}
                    onOpenImportCurl={() => setImportCurlModalOpen(true)}
                />

                {/* Variable Resolution Live Preview */}
                {urlHasVariables && (
                    <div className="url-variable-preview-banner">
                        <div className="url-banner-left">
                            <span className="url-banner-icon">
                                <MaterialIcon size={14}>swap_horiz</MaterialIcon>
                            </span>
                            <span className="url-banner-title">Resolved URL:</span>
                            <code className="url-banner-resolved-url">{resolvedUrlPreview}</code>
                        </div>
                        <div className="url-banner-right">
                            {activeEnvironment ? (
                                <span className="url-banner-env-tag" title={`Resolved from ${activeEnvironment.name}`}>
                                    <MaterialIcon size={12}>layers</MaterialIcon>
                                    <span>{activeEnvironment.name}</span>
                                </span>
                            ) : (
                                <span className="url-banner-no-env-tag" title="No environment selected; variables will not be substituted">
                                    <MaterialIcon size={12}>warning</MaterialIcon>
                                    <span>No active environment</span>
                                </span>
                            )}
                            {unresolvedVars.length > 0 && (
                                <span
                                    className="url-banner-unresolved-tag"
                                    title={`Unresolved: ${unresolvedVars.join(", ")}`}
                                >
                                    {unresolvedVars.length} unresolved
                                </span>
                            )}
                        </div>
                    </div>
                )}

                <div className="request-tabs-bar">
                    {REQUEST_TABS.map((tab) => {
                        let badge = null;
                        if (tab.id === "params" && activeParamCount > 0) badge = activeParamCount;
                        if (tab.id === "auth" && auth?.type && auth.type !== "none") badge = "•";
                        if (tab.id === "headers" && activeHeaderCount > 0) badge = activeHeaderCount;
                        if (tab.id === "body" && bodyType !== "none") badge = "•";

                        return (
                            <button
                                key={tab.id}
                                type="button"
                                className={`request-tab-btn ${activeTab === tab.id ? "is-active" : ""}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span>{tab.label}</span>
                                {badge !== null && <span className="tab-badge">{badge}</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="request-tab-content">
                    {activeTab === "params" && (
                        <div className="params-tab-pane">
                            <div className="pane-header">
                                <h3>Query Parameters</h3>
                                <p className="pane-caption">Parameters automatically append to the request URL.</p>
                            </div>
                            <KeyValueTable
                                rows={queryParams}
                                onChange={handleQueryParamsChange}
                                keyPlaceholder="Parameter"
                                valuePlaceholder="Value"
                            />
                        </div>
                    )}

                    {activeTab === "auth" && (
                        <RequestAuthEditor
                            auth={auth}
                            onChange={setAuth}
                            activeEnvironment={activeEnvironment}
                            variablesMap={activeVariablesMap}
                        />
                    )}

                    {activeTab === "headers" && (
                        <div className="headers-tab-pane">
                            <div className="pane-header">
                                <h3>Request Headers</h3>
                                <p className="pane-caption">Custom headers attached to the outbound HTTP request.</p>
                            </div>
                            <KeyValueTable
                                rows={headers}
                                onChange={setHeaders}
                                keyPlaceholder="Header"
                                valuePlaceholder="Value"
                            />
                        </div>
                    )}

                    {activeTab === "body" && (
                        <RequestBodyEditor
                            bodyType={bodyType}
                            onBodyTypeChange={setBodyType}
                            bodyContent={bodyContent}
                            onBodyContentChange={setBodyContent}
                        />
                    )}

                    {activeTab === "settings" && (
                        <div className="settings-tab-pane">
                            <div className="pane-header">
                                <h3>Request Settings</h3>
                            </div>
                            <div className="setting-row">
                                <label htmlFor="timeout-input">
                                    <strong>Request Timeout (ms)</strong>
                                    <span>Max duration to wait for a response before timing out</span>
                                </label>
                                <input
                                    id="timeout-input"
                                    type="number"
                                    className="text-input num-input"
                                    value={timeoutMs}
                                    min={100}
                                    max={60000}
                                    step={1000}
                                    onChange={(e) => setTimeoutMs(Number(e.target.value) || 30000)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div
                className={`response-resize-divider ${isDragging ? "is-dragging" : ""}`}
                onPointerDown={handleResizePointerDown}
                onDoubleClick={handleResizeDoubleClick}
                onDragStart={(e) => e.preventDefault()}
                draggable="false"
                title="Drag up or down to resize response (Double-click to toggle height)"
            >
                <div className="resize-handle-pill" aria-hidden="true">
                    <span className="resize-handle-grip" />
                </div>
            </div>

            <ResponseViewer
                response={response}
                loading={loading}
                error={error}
                height={responseHeight}
                onHeightChange={setResponseHeight}
                isDragging={isDragging}
            />

            {saveModalOpen && (
                <SaveRequestModal
                    initialName={requestName}
                    initialCollectionId={collectionId}
                    initialFolderId={folderId}
                    collections={collections}
                    collectionsLoading={collectionsLoading}
                    onSave={handleSaveConfirm}
                    onClose={() => setSaveModalOpen(false)}
                    saving={saving}
                />
            )}

            <CodeSnippetModal
                isOpen={codeModalOpen}
                onClose={() => setCodeModalOpen(false)}
                requestConfig={{
                    method,
                    url,
                    queryParams,
                    headers,
                    bodyType,
                    bodyContent,
                    auth,
                }}
                activeEnvironment={activeEnvironment}
            />

            <ImportCurlModal
                isOpen={importCurlModalOpen}
                onClose={() => setImportCurlModalOpen(false)}
                onImport={handleImportCurl}
            />
        </div>
    );
}
