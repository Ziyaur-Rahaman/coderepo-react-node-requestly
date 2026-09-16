import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

export function DescriptionPopover({ info, onClose }) {
    const popoverRef = useRef(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (!info?.anchorEl) return;
        const rect = info.anchorEl.getBoundingClientRect();
        const popoverWidth = 290;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Preferred position: to the right of the button
        let left = rect.right + 8;
        // If it would overflow viewport on the right, position to the left or clamp
        if (left + popoverWidth > viewportWidth - 12) {
            left = rect.left - popoverWidth - 8;
        }
        if (left < 12) {
            left = 12;
        }

        // Align top with anchor, but keep within viewport
        let top = rect.top - 6;
        const estimatedHeight = 160;
        if (top + estimatedHeight > viewportHeight - 12) {
            top = viewportHeight - estimatedHeight - 12;
        }
        if (top < 12) {
            top = 12;
        }

        setPos({ top, left });
    }, [info]);

    // Close on outside mousedown
    useEffect(() => {
        const handleMouseDown = (e) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(e.target) &&
                info?.anchorEl &&
                !info.anchorEl.contains(e.target)
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
    }, [info, onClose]);

    // Close on Escape key
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [onClose]);

    if (!info) return null;

    const isCollection = info.type === "Collection";

    return createPortal(
        <div
            ref={popoverRef}
            className="description-popover-portal"
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 99999 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={`${info.type} description`}
        >
            <div className="description-popover-header">
                <div className="description-popover-badge">
                    <MaterialIcon size={14}>
                        {isCollection ? "folder_special" : "folder"}
                    </MaterialIcon>
                    <span>{info.type}</span>
                </div>
                <button
                    type="button"
                    className="description-popover-close-btn"
                    onClick={onClose}
                    title="Close"
                    aria-label="Close"
                >
                    <MaterialIcon size={14}>close</MaterialIcon>
                </button>
            </div>
            <div className="description-popover-title">{info.name}</div>
            <div className="description-popover-content">
                {info.description}
            </div>
        </div>,
        document.body,
    );
}
