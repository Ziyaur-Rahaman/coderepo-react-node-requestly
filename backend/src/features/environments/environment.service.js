import mongoose from "mongoose";
import { AppError } from "../../shared/errors/app-error.js";
import { environmentRepository } from "./environment.repository.js";
import { buildVariablesMap } from "./variable-resolver.js";

function ensureValidObjectId(id, message = "The requested environment does not exist.") {
    if (!mongoose.isValidObjectId(id)) {
        throw new AppError(404, "NOT_FOUND", message);
    }
}

export const environmentService = {
    async list(ownerId) {
        if (!ownerId) {
            throw new AppError(401, "AUTH_REQUIRED", "Owner ID is required.");
        }
        return environmentRepository.list(ownerId);
    },

    async getById(id, ownerId) {
        ensureValidObjectId(id);
        const env = await environmentRepository.findById(id, ownerId);
        if (!env) {
            throw new AppError(404, "ENVIRONMENT_NOT_FOUND", "The requested environment does not exist.");
        }
        return env;
    },

    async create(input, ownerId) {
        if (!ownerId) {
            throw new AppError(401, "AUTH_REQUIRED", "Owner ID is required.");
        }

        const trimmedName = input.name?.trim();
        if (!trimmedName) {
            throw new AppError(400, "VALIDATION_ERROR", "Environment name is required.");
        }

        const existing = await environmentRepository.findByName(trimmedName, ownerId);
        if (existing) {
            throw new AppError(409, "ENVIRONMENT_EXISTS", "An environment with this name already exists.");
        }

        const variables = (input.variables || [])
            .filter((v) => v && typeof v === "object")
            .map((v) => ({
                key: String(v.key || "").trim(),
                value: String(v.value ?? ""),
                type: v.type === "secret" ? "secret" : "default",
                enabled: v.enabled !== false,
            }))
            .filter((v) => Boolean(v.key));

        return environmentRepository.create({
            name: trimmedName,
            description: input.description?.trim() || "",
            ownerId,
            variables,
            isDefault: Boolean(input.isDefault),
        });
    },

    async update(id, input, ownerId) {
        ensureValidObjectId(id);
        const existing = await environmentRepository.findById(id, ownerId);
        if (!existing) {
            throw new AppError(404, "ENVIRONMENT_NOT_FOUND", "The requested environment does not exist.");
        }

        const updateData = {};
        if (input.name !== undefined) {
            const trimmedName = input.name.trim();
            if (!trimmedName) {
                throw new AppError(400, "VALIDATION_ERROR", "Environment name is required.");
            }
            // If name changed, verify uniqueness
            if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
                const dup = await environmentRepository.findByName(trimmedName, ownerId);
                if (dup && String(dup._id) !== String(id)) {
                    throw new AppError(409, "ENVIRONMENT_EXISTS", "An environment with this name already exists.");
                }
            }
            updateData.name = trimmedName;
        }

        if (input.description !== undefined) {
            updateData.description = input.description.trim();
        }

        if (input.isDefault !== undefined) {
            updateData.isDefault = Boolean(input.isDefault);
        }

        if (input.variables !== undefined && Array.isArray(input.variables)) {
            updateData.variables = input.variables
                .filter((v) => v && typeof v === "object")
                .map((v) => ({
                    key: String(v.key || "").trim(),
                    value: String(v.value ?? ""),
                    type: v.type === "secret" ? "secret" : "default",
                    enabled: v.enabled !== false,
                }))
                .filter((v) => Boolean(v.key));
        }

        const updated = await environmentRepository.update(id, updateData, ownerId);
        return updated;
    },

    async remove(id, ownerId) {
        ensureValidObjectId(id);
        const deleted = await environmentRepository.remove(id, ownerId);
        if (!deleted) {
            throw new AppError(404, "ENVIRONMENT_NOT_FOUND", "The requested environment does not exist.");
        }
        return deleted;
    },

    async duplicate(id, ownerId) {
        ensureValidObjectId(id);
        const original = await environmentRepository.findById(id, ownerId);
        if (!original) {
            throw new AppError(404, "ENVIRONMENT_NOT_FOUND", "The requested environment does not exist.");
        }

        let copyName = `${original.name} (Copy)`;
        let suffix = 1;
        while (await environmentRepository.findByName(copyName, ownerId)) {
            suffix += 1;
            copyName = `${original.name} (Copy ${suffix})`;
        }

        const clonedVariables = (original.variables || []).map((v) => ({
            key: v.key,
            value: v.value,
            type: v.type,
            enabled: v.enabled,
        }));

        return environmentRepository.create({
            name: copyName,
            description: original.description || "",
            ownerId,
            variables: clonedVariables,
            isDefault: false,
        });
    },

    async getVariablesMap(id, ownerId) {
        if (!id) return {};
        ensureValidObjectId(id);
        const env = await environmentRepository.findById(id, ownerId);
        if (!env) return {};
        return buildVariablesMap(env.variables);
    },
};
