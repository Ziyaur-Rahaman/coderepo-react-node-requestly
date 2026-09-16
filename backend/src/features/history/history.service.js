import mongoose from "mongoose";
import { AppError } from "../../shared/errors/app-error.js";
import { historyRepository } from "./history.repository.js";

const MAX_BODY_STORAGE_CHARS = 500000; // 500 KB limit for response body in history

function ensureValidObjectId(id, message = "The requested history item does not exist.") {
    if (!mongoose.isValidObjectId(id)) {
        throw new AppError(404, "NOT_FOUND", message);
    }
}

export const historyService = {
    async record({
        ownerId,
        requestId = null,
        name = "Untitled Request",
        collectionId = null,
        folderId = null,
        environmentId = null,
        environmentName = null,
        requestData,
        responseData,
    }) {
        if (!ownerId) {
            return null; // Don't crash if ownerId missing, though auth middleware guarantees it
        }

        try {
            // Bound response body string length if necessary
            let responseBody = responseData.body || "";
            const note = "\n\n[... response body truncated for history storage ...]";
            if (typeof responseBody === "string" && responseBody.length > MAX_BODY_STORAGE_CHARS) {
                responseBody = responseBody.slice(0, MAX_BODY_STORAGE_CHARS - note.length) + note;
            }

            // Bound request body string length if necessary
            let requestBody = requestData.bodyContent || "";
            if (typeof requestBody === "string" && requestBody.length > MAX_BODY_STORAGE_CHARS) {
                requestBody = requestBody.slice(0, MAX_BODY_STORAGE_CHARS);
            }

            const historyEntry = await historyRepository.create({
                ownerId,
                requestId: requestId && mongoose.isValidObjectId(requestId) ? requestId : null,
                name: name || "Untitled Request",
                collectionId: collectionId && mongoose.isValidObjectId(collectionId) ? collectionId : null,
                folderId: folderId && mongoose.isValidObjectId(folderId) ? folderId : null,
                environmentId: environmentId && mongoose.isValidObjectId(environmentId) ? environmentId : null,
                environmentName: environmentName || null,
                request: {
                    method: requestData.method || "GET",
                    url: requestData.url || "",
                    queryParams: requestData.queryParams || [],
                    headers: requestData.headers || [],
                    bodyType: requestData.bodyType || "none",
                    bodyContent: requestBody,
                    auth: requestData.auth || { type: "none", config: {} },
                },
                response: {
                    status: responseData.status || 0,
                    statusText: responseData.statusText || "",
                    headers: responseData.headers || {},
                    body: responseBody,
                    timeMs: responseData.timeMs || 0,
                    sizeBytes: responseData.sizeBytes || 0,
                    url: responseData.url || requestData.url || "",
                },
                executedAt: new Date(),
            });

            return historyEntry;
        } catch (err) {
            console.error("Failed to record request history:", err.message);
            return null;
        }
    },

    async list(ownerId, options = {}) {
        return historyRepository.list(ownerId, options);
    },

    async getById(id, ownerId) {
        ensureValidObjectId(id);
        const item = await historyRepository.findById(id, ownerId);
        if (!item) {
            throw new AppError(404, "HISTORY_NOT_FOUND", "The requested history item does not exist.");
        }
        return item;
    },

    async remove(id, ownerId) {
        ensureValidObjectId(id);
        const deleted = await historyRepository.deleteById(id, ownerId);
        if (!deleted) {
            throw new AppError(404, "HISTORY_NOT_FOUND", "The requested history item does not exist.");
        }
        return deleted;
    },

    async clearAll(ownerId) {
        if (!ownerId) {
            throw new AppError(401, "AUTH_REQUIRED", "Owner ID is required to clear history.");
        }
        return historyRepository.clearAll(ownerId);
    },
};
