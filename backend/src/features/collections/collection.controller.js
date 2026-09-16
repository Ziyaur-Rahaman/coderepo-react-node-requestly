import { z } from "zod";
import { collectionService } from "./collection.service.js";

const createCollectionSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(120),
    description: z.string().trim().max(1024).default(""),
    auth: z
        .object({
            type: z.enum(["none", "bearer", "basic", "apiKey"]).default("none"),
            config: z.record(z.any()).default({}),
        })
        .optional(),
});

const updateCollectionSchema = createCollectionSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update.");

const createFolderSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(120),
    description: z.string().trim().max(1024).default(""),
    parentId: z.string().nullable().optional(),
});

const updateFolderSchema = createFolderSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update.");

export async function listCollections(req, res, next) {
    try {
        const collections = await collectionService.list(req.profileId);
        res.json({ data: collections });
    } catch (error) {
        next(error);
    }
}

export async function getCollectionTree(req, res, next) {
    try {
        const tree = await collectionService.getTree(req.profileId);
        res.json({ data: tree });
    } catch (error) {
        next(error);
    }
}

export async function getCollection(req, res, next) {
    try {
        const collection = await collectionService.getById(req.params.collectionId, req.profileId);
        res.json({ data: collection });
    } catch (error) {
        next(error);
    }
}

export async function createCollection(req, res, next) {
    try {
        const input = createCollectionSchema.parse(req.body);
        const created = await collectionService.create(input, req.profileId);
        res.status(201).json({ data: created });
    } catch (error) {
        next(error);
    }
}

export async function updateCollection(req, res, next) {
    try {
        const input = updateCollectionSchema.parse(req.body);
        const updated = await collectionService.update(req.params.collectionId, input, req.profileId);
        res.json({ data: updated });
    } catch (error) {
        next(error);
    }
}

export async function deleteCollection(req, res, next) {
    try {
        await collectionService.delete(req.params.collectionId, req.profileId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
}

export async function duplicateCollection(req, res, next) {
    try {
        const duplicated = await collectionService.duplicate(req.params.collectionId, req.profileId);
        res.status(201).json({ data: duplicated });
    } catch (error) {
        next(error);
    }
}

// --- Folder Handlers ---
export async function listFolders(req, res, next) {
    try {
        const folders = await collectionService.listFolders(req.params.collectionId, req.profileId);
        res.json({ data: folders });
    } catch (error) {
        next(error);
    }
}

export async function createFolder(req, res, next) {
    try {
        const input = createFolderSchema.parse(req.body);
        const folder = await collectionService.createFolder(req.params.collectionId, input, req.profileId);
        res.status(201).json({ data: folder });
    } catch (error) {
        next(error);
    }
}

export async function updateFolder(req, res, next) {
    try {
        const input = updateFolderSchema.parse(req.body);
        const updated = await collectionService.updateFolder(
            req.params.collectionId,
            req.params.folderId,
            input,
            req.profileId,
        );
        res.json({ data: updated });
    } catch (error) {
        next(error);
    }
}

export async function deleteFolder(req, res, next) {
    try {
        await collectionService.deleteFolder(req.params.collectionId, req.params.folderId, req.profileId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
}

export async function duplicateFolder(req, res, next) {
    try {
        const duplicated = await collectionService.duplicateFolder(
            req.params.collectionId,
            req.params.folderId,
            req.profileId,
        );
        res.status(201).json({ data: duplicated });
    } catch (error) {
        next(error);
    }
}
