import { z } from "zod";
import { historyService } from "./history.service.js";

const listQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    skip: z.coerce.number().int().min(0).default(0),
    search: z.string().trim().default(""),
    method: z.string().trim().default(""),
});

export async function listHistory(req, res, next) {
    try {
        const query = listQuerySchema.parse(req.query);
        const result = await historyService.list(req.profileId, query);
        res.json({
            data: result.items,
            meta: {
                total: result.total,
                limit: query.limit,
                skip: query.skip,
            },
        });
    } catch (error) {
        next(error);
    }
}

export async function getHistory(req, res, next) {
    try {
        const item = await historyService.getById(req.params.historyId, req.profileId);
        res.json({ data: item });
    } catch (error) {
        next(error);
    }
}

export async function deleteHistory(req, res, next) {
    try {
        await historyService.remove(req.params.historyId, req.profileId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
}

export async function clearHistory(req, res, next) {
    try {
        await historyService.clearAll(req.profileId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
}
