import React, { useState, useEffect, useCallback } from "react";
import { authApi } from "./features/auth/auth.api.js";
import { workspaceApi } from "./features/workspaces/workspace.api.js";
import { WorkspaceLogin } from "./features/auth/WorkspaceLogin.jsx";
import { CreateAccount } from "./features/auth/CreateAccount.jsx";
import { WorkspacePicker } from "./features/workspaces/WorkspacePicker.jsx";
import { PostmanWorkspace } from "./features/requests/PostmanWorkspace.jsx";
import {
    hasProfileToken,
    hasSessionToken,
    setProfileToken,
    setSessionToken,
} from "./shared/api/client.js";

function AppBootScreen() {
    return (
        <div className="app-boot">
            <div className="app-boot-brand">
                <span className="postman-logo-icon" style={{ width: 44, height: 44, fontSize: 22 }}>
                    R
                </span>
                <strong>Requestly</strong>
            </div>
            <div className="app-boot-progress">
                <span />
            </div>
        </div>
    );
}

export default function App() {
    const [account, setAccount] = useState(null);
    const [authMode, setAuthMode] = useState("login"); // "login" | "register"
    const [authLoading, setAuthLoading] = useState(false);
    const [bootstrapping, setBootstrapping] = useState(true);
    const [authError, setAuthError] = useState("");
    const [workspaces, setWorkspaces] = useState(null);
    const [workspaceError, setWorkspaceError] = useState("");
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
        () => localStorage.getItem("postman-workspace-id") || "",
    );

    const loadWorkspaces = useCallback(async () => {
        try {
            setWorkspaceError("");
            const list = await workspaceApi.list();
            setWorkspaces(list);
            return list;
        } catch (error) {
            setWorkspaceError(error.message || "Failed to load workspaces.");
            setWorkspaces([]);
            return [];
        }
    }, []);

    useEffect(() => {
        const expire = (event) => {
            setProfileToken("");
            setSessionToken("");
            localStorage.removeItem("postman-workspace-id");
            setSelectedWorkspaceId("");
            setAccount(null);
            setWorkspaces(null);
            setAuthError(event.detail || "Your session has expired.");
        };
        window.addEventListener("postman-session-expired", expire);
        return () => window.removeEventListener("postman-session-expired", expire);
    }, []);

    useEffect(() => {
        let active = true;
        const restore = async () => {
            if (!hasSessionToken()) {
                if (active) setBootstrapping(false);
                return;
            }
            let restoredSession = null;
            let restoreError = null;
            try {
                restoredSession = await authApi.session();
            } catch (error) {
                restoreError = error;
                if (hasProfileToken()) {
                    setProfileToken("");
                    localStorage.removeItem("postman-workspace-id");
                    try {
                        restoredSession = await authApi.session();
                        restoreError = null;
                    } catch (sessionError) {
                        restoreError = sessionError;
                    }
                }
            }
            if (!active) return;
            if (!restoredSession) {
                setProfileToken("");
                setSessionToken("");
                localStorage.removeItem("postman-workspace-id");
                setAuthError(restoreError?.message || "Your session has expired.");
                setBootstrapping(false);
                return;
            }
            let restoredWorkspaces = [];
            let restoredWorkspaceError = "";
            try {
                restoredWorkspaces = await workspaceApi.list();
            } catch (workspaceRequestError) {
                restoredWorkspaceError = workspaceRequestError.message;
            }
            if (!active) return;
            setAccount(restoredSession.account);
            setWorkspaces(restoredWorkspaces);
            setAuthError("");
            setWorkspaceError(restoredWorkspaceError);
            setBootstrapping(false);
        };
        restore();
        return () => {
            active = false;
        };
    }, []);

    const activeWorkspace = workspaces?.find((w) => String(w._id) === selectedWorkspaceId);

    useEffect(() => {
        if (workspaces === null) return;
        if (selectedWorkspaceId && !activeWorkspace) {
            localStorage.removeItem("postman-workspace-id");
            setProfileToken("");
            setSelectedWorkspaceId("");
        }
    }, [activeWorkspace, workspaces, selectedWorkspaceId]);

    const selectWorkspace = async (workspace) => {
        try {
            setWorkspaceError("");
            const result = await authApi.switchProfile(workspace._id);
            setProfileToken(result.token);
            localStorage.setItem("postman-workspace-id", workspace._id);
            setSelectedWorkspaceId(String(workspace._id));
        } catch (error) {
            setWorkspaceError(error.message);
        }
    };

    const createWorkspace = async ({ name, description }) => {
        setWorkspaceError("");
        const created = await workspaceApi.create({ name, description });
        setWorkspaces((prev) => [...(prev || []), created]);
        await selectWorkspace(created);
    };

    const updateWorkspace = async (id, { name, description }) => {
        setWorkspaceError("");
        const updated = await workspaceApi.update(id, { name, description });
        setWorkspaces((prev) => prev.map((w) => (String(w._id) === String(id) ? updated : w)));
    };

    const deleteWorkspace = async (id) => {
        setWorkspaceError("");
        await workspaceApi.delete(id);
        setWorkspaces((prev) => prev.filter((w) => String(w._id) !== String(id)));
    };

    const login = async (email, password) => {
        try {
            setAuthLoading(true);
            setAuthError("");
            const result = await authApi.login(email, password);
            setSessionToken(result.token);
            setAccount(result.account);
            setProfileToken("");
            localStorage.removeItem("postman-workspace-id");
            setSelectedWorkspaceId("");

            let discoveredWorkspaces = [];
            try {
                setWorkspaceError("");
                discoveredWorkspaces = await workspaceApi.list();
            } catch (workspaceRequestError) {
                setWorkspaceError(workspaceRequestError.message);
            }
            setWorkspaces(discoveredWorkspaces);
        } catch (error) {
            setAuthError(error.message);
        } finally {
            setAuthLoading(false);
        }
    };

    const register = async ({ name, email, password }) => {
        try {
            setAuthLoading(true);
            setAuthError("");
            const result = await authApi.register({ name, email, password });
            setSessionToken(result.token);
            setAccount(result.account);

            if (result.profileToken) {
                setProfileToken(result.profileToken);
            }
            if (result.profile?._id) {
                localStorage.setItem("postman-workspace-id", result.profile._id);
                setSelectedWorkspaceId(String(result.profile._id));
            }

            const discovered = await workspaceApi.list();
            setWorkspaces(discovered);
            setAuthMode("login");
        } catch (error) {
            setAuthError(error.message);
        } finally {
            setAuthLoading(false);
        }
    };

    const logout = async () => {
        try {
            if (hasSessionToken()) await authApi.logout();
        } catch {}
        setProfileToken("");
        setSessionToken("");
        localStorage.removeItem("postman-workspace-id");
        setSelectedWorkspaceId("");
        setAccount(null);
        setWorkspaces(null);
        setAuthError("");
    };

    if (bootstrapping) return <AppBootScreen />;

    if (!account) {
        if (authMode === "register") {
            return (
                <CreateAccount
                    error={authError}
                    loading={authLoading}
                    onCreateAccount={register}
                    onSwitchToLogin={() => {
                        setAuthError("");
                        setAuthMode("login");
                    }}
                />
            );
        }
        return (
            <WorkspaceLogin
                error={authError}
                loading={authLoading}
                onLogin={login}
                onSwitchToRegister={() => {
                    setAuthError("");
                    setAuthMode("register");
                }}
            />
        );
    }

    if (activeWorkspace) {
        return (
            <PostmanWorkspace
                activeProfile={{
                    _id: activeWorkspace._id,
                    name: activeWorkspace.name,
                    email: account.email,
                    avatarColor: activeWorkspace.avatarColor || account?.avatarColor,
                }}
                activeWorkspace={activeWorkspace}
                key={activeWorkspace._id}
                onLogout={logout}
                onSwitchProfile={() => {
                    localStorage.removeItem("postman-workspace-id");
                    setProfileToken("");
                    setSelectedWorkspaceId("");
                }}
            />
        );
    }

    return (
        <WorkspacePicker
            error={workspaceError}
            loading={workspaces === null}
            onCreateWorkspace={createWorkspace}
            onUpdateWorkspace={updateWorkspace}
            onDeleteWorkspace={deleteWorkspace}
            onLogout={logout}
            onRetry={loadWorkspaces}
            onSelect={selectWorkspace}
            workspaces={workspaces || []}
        />
    );
}
