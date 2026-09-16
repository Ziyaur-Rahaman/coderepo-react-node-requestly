import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

export function EnvironmentSelector({
    environments = [],
    activeEnvironmentId,
    onSelectEnvironment,
    onCreateEnvironment,
    onManageEnvironments,
    loading = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef(null);

    // Compute portal position when opening
    const openDropdown = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setMenuPos({
                top: rect.bottom + 4,
                left: rect.left,
            });
        }
        setIsOpen(true);
    };

    // Close dropdown on outside click or escape
    useEffect(() => {
        if (!isOpen) return;
        const handleOutside = (e) => {
            if (btnRef.current && !btnRef.current.contains(e.target)) {
                // Check if click is inside the portal dropdown
                const portal = document.getElementById("env-selector-portal");
                if (portal && portal.contains(e.target)) return;
                setIsOpen(false);
            }
        };
        const handleEscape = (e) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        // Delay slightly so the open-click doesn't immediately close
        const tid = setTimeout(() => {
            document.addEventListener("mousedown", handleOutside);
            document.addEventListener("keydown", handleEscape);
        }, 30);
        return () => {
            clearTimeout(tid);
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen]);

    const activeEnv = environments.find((e) => e._id === activeEnvironmentId);

    const dropdown = isOpen && createPortal(
        <div
            id="env-selector-portal"
            className="env-selector-dropdown"
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 99999 }}
            role="listbox"
        >
            <div className="env-dropdown-header">
                <span>ENVIRONMENTS</span>
            </div>

            {/* Option: No Environment */}
            <button
                type="button"
                className={`env-dropdown-item ${!activeEnvironmentId ? "selected" : ""}`}
                onClick={() => {
                    onSelectEnvironment(null);
                    setIsOpen(false);
                }}
                role="option"
                aria-selected={!activeEnvironmentId}
            >
                <span className="item-icon">
                    <MaterialIcon size={16}>public_off</MaterialIcon>
                </span>
                <span className="item-text">No Environment</span>
                {!activeEnvironmentId && (
                    <span className="item-check">
                        <MaterialIcon size={16}>check</MaterialIcon>
                    </span>
                )}
            </button>

            <div className="env-dropdown-divider" />

            {/* List of Environments */}
            {environments.length === 0 ? (
                <div className="env-dropdown-empty">
                    <span>No environments created yet</span>
                </div>
            ) : (
                environments.map((env) => {
                    const isSelected = env._id === activeEnvironmentId;
                    const varCount = (env.variables || []).filter((v) => v.enabled !== false).length;

                    return (
                        <button
                            key={env._id}
                            type="button"
                            className={`env-dropdown-item ${isSelected ? "selected" : ""}`}
                            onClick={() => {
                                onSelectEnvironment(env._id);
                                setIsOpen(false);
                            }}
                            role="option"
                            aria-selected={isSelected}
                        >
                            <span className="item-icon">
                                <MaterialIcon size={16}>layers</MaterialIcon>
                            </span>
                            <span className="item-text-wrap">
                                <span className="item-name">{env.name}</span>
                                <span className="item-badge">{varCount} vars</span>
                            </span>
                            {isSelected && (
                                <span className="item-check">
                                    <MaterialIcon size={16}>check</MaterialIcon>
                                </span>
                            )}
                        </button>
                    );
                })
            )}

            <div className="env-dropdown-divider" />

            {/* Action items */}
            {onCreateEnvironment && (
                <button
                    type="button"
                    className="env-dropdown-action-item"
                    onClick={() => {
                        setIsOpen(false);
                        onCreateEnvironment();
                    }}
                >
                    <MaterialIcon size={16}>add</MaterialIcon>
                    <span>Create Environment</span>
                </button>
            )}

            {onManageEnvironments && (
                <button
                    type="button"
                    className="env-dropdown-action-item"
                    onClick={() => {
                        setIsOpen(false);
                        onManageEnvironments();
                    }}
                >
                    <MaterialIcon size={16}>tune</MaterialIcon>
                    <span>Manage Environments</span>
                </button>
            )}
        </div>,
        document.body
    );

    return (
        <div className="env-selector-anchor">
            <button
                ref={btnRef}
                type="button"
                className={`env-selector-btn ${activeEnv ? "has-active" : "no-active"} ${isOpen ? "open" : ""}`}
                onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                title={activeEnv ? `Active Environment: ${activeEnv.name}` : "No Environment"}
            >
                <span className="env-selector-icon">
                    <MaterialIcon size={16}>
                        {activeEnv ? "public" : "public_off"}
                    </MaterialIcon>
                </span>
                <span className="env-selector-label">
                    {loading
                        ? "Loading..."
                        : activeEnv
                        ? activeEnv.name
                        : "No Environment"}
                </span>
                <MaterialIcon size={16} className="env-selector-arrow">
                    expand_more
                </MaterialIcon>
            </button>

            {dropdown}
        </div>
    );
}
