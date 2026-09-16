import { identityInitials } from "../../shared/utils/identity.js";

const DEFAULT_AVATAR_COLORS = [
    "#ea580c", // Vibrant orange
    "#0b57d0", // Vibrant blue
    "#059669", // Vibrant emerald
    "#7c3aed", // Vibrant violet
    "#d97706", // Vibrant amber
    "#db2777", // Vibrant pink
    "#0284c7", // Vibrant sky
    "#4f46e5", // Vibrant indigo
];

function getAvatarColor(profile) {
    if (profile?.avatarColor && typeof profile.avatarColor === "string") {
        return profile.avatarColor;
    }
    const seed = String(profile?.name || profile?.email || "W");
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % DEFAULT_AVATAR_COLORS.length;
    return DEFAULT_AVATAR_COLORS[index];
}

export function ProfileAvatar({ profile, size = "medium" }) {
    const color = getAvatarColor(profile);
    const initials = identityInitials(profile?.name || "");

    return (
        <span
            className={`profile-avatar profile-avatar-${size}`}
            style={{
                "--profile-color": color,
                backgroundColor: color,
                color: "#ffffff",
            }}
            aria-hidden="true"
        >
            <span>{initials}</span>
        </span>
    );
}
