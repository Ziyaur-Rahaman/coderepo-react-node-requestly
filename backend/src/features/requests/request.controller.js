import { z } from "zod";
import { requestService } from "./request.service.js";

const keyValuePairSchema = z.object({
    key: z.string().default(""),
    value: z.string().default(""),
    description: z.string().default(""),
    enabled: z.boolean().default(true),
});

const authSchema = z.object({
    type: z.enum(["none", "bearer", "basic", "apiKey", "inherit"]).default("none"),
    config: z.record(z.string(), z.any()).default({}),
}).default({ type: "none", config: {} });

const sendSchema = z.object({
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
    url: z.string().trim().min(1, "URL is required").max(2048),
    queryParams: z.array(keyValuePairSchema).default([]),
    headers: z.array(keyValuePairSchema).default([]),
    bodyType: z.enum(["none", "json", "text", "form-data", "x-www-form-urlencoded"]).default("none"),
    bodyContent: z.string().default(""),
    auth: authSchema.optional(),
    timeoutMs: z.number().int().min(100).max(60000).default(30000),
    requestId: z.string().nullable().optional(),
    name: z.string().trim().max(120).optional(),
    collectionId: z.string().nullable().optional(),
    folderId: z.string().nullable().optional(),
    environmentId: z.string().nullable().optional(),
});

const createSchema = z.object({
    name: z.string().trim().max(120).optional(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]).default("GET"),
    url: z.string().trim().min(1, "URL is required").max(2048),
    queryParams: z.array(keyValuePairSchema).default([]),
    headers: z.array(keyValuePairSchema).default([]),
    bodyType: z.enum(["none", "json", "text", "form-data", "x-www-form-urlencoded"]).default("none"),
    bodyContent: z.string().default(""),
    auth: authSchema.optional(),
    collectionId: z.string().nullable().optional(),
    folderId: z.string().nullable().optional(),
    isCustomName: z.boolean().optional(),
});

const updateSchema = createSchema.partial().refine((data) => Object.keys(data).length > 0, "Provide at least one field to update.");

export async function sendRequest(req, res, next) {
    try {
        const input = sendSchema.parse(req.body);
        const result = await requestService.send(input, req.profileId);
        res.json({ data: result });
    } catch (error) {
        console.error("sendRequest error:", error);
        next(error);
    }
}

export async function listRequests(req, res, next) {
    try {
        const collectionId = req.query.collectionId;
        const requests = await requestService.list(req.profileId, collectionId);
        res.json({ data: requests });
    } catch (error) {
        next(error);
    }
}

export async function getRequest(req, res, next) {
    try {
        const request = await requestService.getById(req.params.requestId, req.profileId);
        res.json({ data: request });
    } catch (error) {
        next(error);
    }
}

export async function createRequest(req, res, next) {
    try {
        const input = createSchema.parse(req.body);
        const request = await requestService.create(input, req.profileId);
        res.status(201).json({ data: request });
    } catch (error) {
        next(error);
    }
}

export async function updateRequest(req, res, next) {
    try {
        const input = updateSchema.parse(req.body);
        const updated = await requestService.update(req.params.requestId, input, req.profileId);
        res.json({ data: updated });
    } catch (error) {
        next(error);
    }
}

export async function deleteRequest(req, res, next) {
    try {
        await requestService.remove(req.params.requestId, req.profileId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
}

const moveSchema = z.object({
    collectionId: z.string().nullable().optional(),
    folderId: z.string().nullable().optional(),
});

export async function duplicateRequest(req, res, next) {
    try {
        const duplicated = await requestService.duplicate(req.params.requestId, req.profileId);
        res.status(201).json({ data: duplicated });
    } catch (error) {
        next(error);
    }
}

export async function moveRequest(req, res, next) {
    try {
        const input = moveSchema.parse(req.body);
        const moved = await requestService.move(req.params.requestId, input, req.profileId);
        res.json({ data: moved });
    } catch (error) {
        next(error);
    }
}

