import mongoose from "mongoose";
import { WorkspaceModel } from "./workspace.model.js";
import { WorkspaceAccount } from "../auth/workspace-account.model.js";
import { Person } from "../people/person.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export const workspaceService = {
    async list(account) {
        if (!account?._id) {
            throw new AppError(401, "AUTH_REQUIRED", "Authentication required to list workspaces.");
        }

        let workspaces = await WorkspaceModel.find({ ownerId: account._id }).sort({ isDefault: -1, createdAt: 1 }).lean();

        if (workspaces.length === 0) {
            // Auto-initialize default workspaces (Personal, Company, Testing)
            const person = await Person.findOne({ email: account.email }).lean();
            const personalId = person?._id || new mongoose.Types.ObjectId();

            const defaultWorkspaces = [
                {
                    _id: personalId,
                    name: "Personal",
                    description: "Default personal workspace for your API collections and requests",
                    ownerId: account._id,
                    type: "personal",
                    isDefault: true,
                },
                {
                    name: "Company",
                    description: "Team and organization workspace",
                    ownerId: account._id,
                    type: "team",
                    isDefault: false,
                },
                {
                    name: "Testing",
                    description: "Sandbox workspace for testing and experimentation",
                    ownerId: account._id,
                    type: "custom",
                    isDefault: false,
                },
            ];

            const created = await WorkspaceModel.insertMany(defaultWorkspaces);
            const createdIds = created.map((w) => w._id);

            await WorkspaceAccount.updateOne(
                { _id: account._id },
                { $addToSet: { allowedProfileIds: { $each: createdIds } } }
            );

            workspaces = await WorkspaceModel.find({ ownerId: account._id }).sort({ isDefault: -1, createdAt: 1 }).lean();
        }

        return workspaces;
    },

    async create(account, { name, description = "" }) {
        if (!account?._id) {
            throw new AppError(401, "AUTH_REQUIRED", "Authentication required to create a workspace.");
        }

        const trimmedName = (name || "").trim();
        if (!trimmedName) {
            throw new AppError(400, "VALIDATION_ERROR", "Workspace name is required.");
        }
        if (trimmedName.length > 120) {
            throw new AppError(400, "VALIDATION_ERROR", "Workspace name must be at most 120 characters.");
        }

        const workspace = await WorkspaceModel.create({
            name: trimmedName,
            description: (description || "").trim(),
            ownerId: account._id,
            type: "custom",
            isDefault: false,
        });

        await WorkspaceAccount.updateOne(
            { _id: account._id },
            { $addToSet: { allowedProfileIds: workspace._id } }
        );

        return workspace.toObject();
    },

    async getById(account, workspaceId) {
        if (!mongoose.isValidObjectId(workspaceId)) {
            throw new AppError(400, "INVALID_ID", "Invalid workspace identifier.");
        }

        const workspace = await WorkspaceModel.findOne({ _id: workspaceId, ownerId: account._id }).lean();
        if (!workspace) {
            throw new AppError(404, "WORKSPACE_NOT_FOUND", "The requested workspace was not found.");
        }

        return workspace;
    },

    async update(account, workspaceId, { name, description }) {
        if (!account?._id) {
            throw new AppError(401, "AUTH_REQUIRED", "Authentication required.");
        }
        if (!mongoose.isValidObjectId(workspaceId)) {
            throw new AppError(400, "INVALID_ID", "Invalid workspace identifier.");
        }
        const workspace = await WorkspaceModel.findOne({ _id: workspaceId, ownerId: account._id });
        if (!workspace) {
            throw new AppError(404, "WORKSPACE_NOT_FOUND", "The requested workspace was not found.");
        }
        const trimmedName = (name || "").trim();
        if (!trimmedName) {
            throw new AppError(400, "VALIDATION_ERROR", "Workspace name is required.");
        }
        if (trimmedName.length > 120) {
            throw new AppError(400, "VALIDATION_ERROR", "Workspace name must be at most 120 characters.");
        }
        workspace.name = trimmedName;
        workspace.description = (description !== undefined ? description : workspace.description || "").trim();
        await workspace.save();
        return workspace.toObject();
    },

    async delete(account, workspaceId) {
        if (!account?._id) {
            throw new AppError(401, "AUTH_REQUIRED", "Authentication required.");
        }
        if (!mongoose.isValidObjectId(workspaceId)) {
            throw new AppError(400, "INVALID_ID", "Invalid workspace identifier.");
        }
        const workspace = await WorkspaceModel.findOne({ _id: workspaceId, ownerId: account._id });
        if (!workspace) {
            throw new AppError(404, "WORKSPACE_NOT_FOUND", "The requested workspace was not found.");
        }
        if (workspace.isDefault) {
            throw new AppError(400, "CANNOT_DELETE_DEFAULT", "The default Personal workspace cannot be deleted.");
        }
        await WorkspaceModel.deleteOne({ _id: workspaceId });
        await WorkspaceAccount.updateOne(
            { _id: account._id },
            { $pull: { allowedProfileIds: workspace._id } }
        );
        return { deleted: true };
    },
};
