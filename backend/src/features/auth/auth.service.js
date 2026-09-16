import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { AppError } from "../../shared/errors/app-error.js";
import { getConfig } from "../../shared/config/index.js";
import { personService } from "../people/person.service.js";
import { Person } from "../people/person.model.js";
import { WorkspaceModel } from "../workspaces/workspace.model.js";
import { authRepository } from "./auth.repository.js";

const AVATAR_COLORS = [
    "#ff6c37",
    "#1a73e8",
    "#0b8043",
    "#b85c00",
    "#c2185b",
    "#7b1fa2",
    "#00796b",
    "#d93025",
    "#3f51b5",
];

function generateAvatarColor(email = "") {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
}

const publicAccount = (account) => ({ _id: String(account._id), name: account.name, email: account.email });
const sign = (account, profileId) => jwt.sign({ sub: String(account._id), type: profileId ? "profile" : "workspace", ...(profileId ? { profileId: String(profileId) } : {}) }, getConfig().jwtSecret, { expiresIn: getConfig().jwtExpiresIn, issuer: "calendar-api", audience: "calendar-app" });

export const authService = {
    async register({ name, email, password }) {
        const normalizedEmail = email.toLowerCase().trim();
        const existingAccount = await authRepository.findByEmail(normalizedEmail);
        const existingPerson = await Person.findOne({ email: normalizedEmail }).lean();
        if (existingAccount || existingPerson) {
            throw new AppError(409, "EMAIL_EXISTS", "An account with this email already exists.");
        }

        const avatarColor = generateAvatarColor(normalizedEmail);
        const person = await Person.create({
            name: name.trim(),
            email: normalizedEmail,
            avatarColor,
            isProfile: true,
            timeZone: "UTC",
        });

        const passwordHash = await bcrypt.hash(password, 12);
        const account = await authRepository.createAccount({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            allowedProfileIds: [person._id],
            active: true,
        });

        await WorkspaceModel.create({
            _id: person._id,
            name: "Personal",
            description: "Default personal workspace",
            ownerId: account._id,
            type: "personal",
            isDefault: true,
        });

        return {
            account: publicAccount(account),
            profile: {
                _id: String(person._id),
                name: "Personal",
                email: person.email,
                avatarColor: person.avatarColor,
                isProfile: person.isProfile,
            },
            token: sign(account),
            profileToken: sign(account, person._id),
        };
    },
    async login(email, password) {
        const account = await authRepository.findActiveByEmailWithPassword(email.toLowerCase());
        if (!account || !account.passwordHash) throw new AppError(401, "INVALID_CREDENTIALS", "The email or password you entered is incorrect.");
        if (!(await bcrypt.compare(password, account.passwordHash))) throw new AppError(401, "INVALID_CREDENTIALS", "The email or password you entered is incorrect.");
        return { account: publicAccount(account), token: sign(account) };
    },
    async authenticate(token) {
        let payload;
        try { payload = jwt.verify(token, getConfig().jwtSecret, { issuer: "calendar-api", audience: "calendar-app" }); }
        catch { throw new AppError(401, "INVALID_TOKEN", "Your Requestly session is invalid or has expired."); }
        if (!mongoose.isValidObjectId(payload.sub) || !["workspace", "profile"].includes(payload.type)) throw new AppError(401, "INVALID_TOKEN", "Your Requestly session is invalid or has expired.");
        const account = await authRepository.findActiveById(payload.sub);
        if (!account) throw new AppError(401, "ACCOUNT_UNAVAILABLE", "This Requestly workspace is no longer available.");
        
        const isAllowed = account.allowedProfileIds?.some((id) => String(id) === String(payload.profileId))
            || (await WorkspaceModel.exists({ _id: payload.profileId, ownerId: account._id }));
        if (payload.type === "profile" && (!payload.profileId || !isAllowed)) throw new AppError(403, "PROFILE_FORBIDDEN", "This workspace is not available in the current account.");
        return { account, payload };
    },
    session(account) { return { account: publicAccount(account) }; },
    async switchProfile(account, profileId) {
        const isAllowed = account.allowedProfileIds?.some((id) => String(id) === String(profileId))
            || (await WorkspaceModel.exists({ _id: profileId, ownerId: account._id }));
        if (!isAllowed) throw new AppError(403, "PROFILE_FORBIDDEN", "This workspace is not available in the current account.");

        let workspace = await WorkspaceModel.findOne({ _id: profileId, ownerId: account._id }).lean();
        if (workspace) {
            return {
                profile: {
                    _id: String(workspace._id),
                    name: workspace.name,
                    email: account.email,
                },
                token: sign(account, workspace._id),
            };
        }

        const profile = await personService.findProfileById(profileId);
        if (!profile) throw new AppError(404, "PROFILE_NOT_FOUND", "This workspace is no longer available.");
        return { profile, token: sign(account, profileId) };
    },
};
