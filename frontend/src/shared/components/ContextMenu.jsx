import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "./MaterialIcon.jsx";

/**
 * Portal-based context menu that positions itself next to the trigger button.
 * Pass anchorEl (the DOM button element or { getBoundingClientRect }) and items array:
 *   items: [{ label, icon, danger, disabled, onClick }]
 * Or pass children directly for custom content.
 */
export function ContextMenu({ anchorEl, onClose, items, children }) {
    const menuRef = useRef(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (!anchorEl) return;
        const rect = typeof anchorEl.getBoundingClientRect === "function"
            ? anchorEl.getBoundingClientRect()
            : anchorEl;
        const menuWidth = 210;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Right-edge aligned with button, below it
        let left = rect.right - menuWidth;
        if (left < 8) left = rect.left;
        if (left + menuWidth > viewportWidth - 8) left = viewportWidth - menuWidth - 8;

        let top = rect.bottom + 4;
        // Estimate menu height: 40px per item + 16px padding
        const estimatedMenuHeight = items ? items.length * 40 + 16 : 200;
        if (top + estimatedMenuHeight > viewportHeight - 8) {
            top = rect.top - estimatedMenuHeight - 4;
        }

        setPos({ top: Math.max(8, top), left: Math.max(8, left) });
    }, [anchorEl, items]);

    // Close on outside mousedown
    useEffect(() => {
        const handleMouseDown = (e) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target)
            ) {
                onClose();
            }
        };
        const tid = setTimeout(() => {
            document.addEventListener("mousedown", handleMouseDown);
        }, 30);
        return () => {
            clearTimeout(tid);
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [onClose]);

    // Close on Escape
    useEffect(() => {
        const handleKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [onClose]);

    return createPortal(
        <div
            ref={menuRef}
            className="tree-context-dropdown tree-context-dropdown-portal"
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 99999, minWidth: 200 }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Render items array if provided */}
            {items && items.map((item, idx) => {
                if (item.type === "separator") {
                    return <div key={idx} className="context-menu-separator" />;
                }
                return (
                    <button
                        key={idx}
                        type="button"
                        className={`context-menu-item${item.danger ? " danger" : ""}${item.disabled ? " disabled" : ""}`}
                        disabled={item.disabled}
                        onClick={() => {
                            if (!item.disabled) {
                                onClose();
                                item.onClick?.();
                            }
                        }}
                    >
                        {item.icon && (
                            <span className="context-menu-item-icon">
                                <MaterialIcon size={15}>{item.icon}</MaterialIcon>
                            </span>
                        )}
                        <span className="context-menu-item-label">{item.label}</span>
                    </button>
                );
            })}
            {/* Also support children for backwards compatibility */}
            {!items && children}
        </div>,
        document.body,
    );
}
