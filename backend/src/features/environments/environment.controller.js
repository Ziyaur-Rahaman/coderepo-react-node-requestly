import { z } from "zod";
import { environmentService } from "./environment.service.js";

const variableSchema = z.object({
    key: z.string().trim().min(1, "Variable name cannot be empty.").max(120),
    value: z.string().max(4096).default(""),
    type: z.enum(["default", "secret"]).default("default"),
    enabled: z.boolean().default(true),
});

const createEnvironmentSchema = z.object({
    name: z.string().trim().min(1, "Environment name is required.").max(120),
    description: z.string().trim().max(1024).default(""),
    variables: z.array(variableSchema).default([]),
    isDefault: z.boolean().default(false),
});

const updateEnvironmentSchema = createEnvironmentSchema.partial();

export const environmentController = {
    async list(req, res, next) {
        try {
            const environments = await environmentService.list(req.profile._id);
            res.json({ data: environments });
        } catch (err) {
            next(err);
        }
    },

    async getById(req, res, next) {
        try {
            const environment = await environmentService.getById(req.params.id, req.profile._id);
            res.json({ data: environment });
        } catch (err) {
            next(err);
        }
    },

    async create(req, res, next) {
        try {
            const parsed = createEnvironmentSchema.parse(req.body);
            const created = await environmentService.create(parsed, req.profile._id);
            res.status(201).json({ data: created });
        } catch (err) {
            next(err);
        }
    },

    async update(req, res, next) {
        try {
            const parsed = updateEnvironmentSchema.parse(req.body);
            const updated = await environmentService.update(req.params.id, parsed, req.profile._id);
            res.json({ data: updated });
        } catch (err) {
            next(err);
        }
    },

    async remove(req, res, next) {
        try {
            const deleted = await environmentService.remove(req.params.id, req.profile._id);
            res.json({ data: deleted, message: "Environment deleted successfully." });
        } catch (err) {
            next(err);
        }
    },

    async duplicate(req, res, next) {
        try {
            const duplicated = await environmentService.duplicate(req.params.id, req.profile._id);
            res.status(201).json({ data: duplicated });
        } catch (err) {
            next(err);
        }
    },
};
