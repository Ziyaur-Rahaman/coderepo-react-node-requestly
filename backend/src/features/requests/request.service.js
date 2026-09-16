import mongoose from "mongoose";
import { AppError } from "../../shared/errors/app-error.js";
import { environmentRepository } from "../environments/environment.repository.js";
import { resolveRequestConfig } from "../environments/variable-resolver.js";
import { historyService } from "../history/history.service.js";
import { RequestModel } from "./request.model.js";
import { requestRepository } from "./request.repository.js";

export function getNextUntitledName(existingNames = []) {
    const baseName = "Untitled Request";
    const nameSet = new Set(
        existingNames
            .filter(Boolean)
            .map((n) => n.trim().toLowerCase())
    );

    if (!nameSet.has(baseName.toLowerCase())) {
        return baseName;
    }

    let i = 2;
    while (nameSet.has(`${baseName.toLowerCase()} ${i}`)) {
        i++;
    }
    return `${baseName} ${i}`;
}

function ensureValidObjectId(id, message = "The requested resource does not exist.") {
    if (!mongoose.isValidObjectId(id)) {
        throw new AppError(404, "NOT_FOUND", message);
    }
}

export const requestService = {
    async list(ownerId, collectionId) {
        return requestRepository.list(ownerId, collectionId);
    },

    async getById(id, ownerId) {
        ensureValidObjectId(id, "The requested request does not exist.");
        const request = await requestRepository.findById(id, ownerId);
        if (!request) {
            throw new AppError(404, "REQUEST_NOT_FOUND", "The requested request does not exist.");
        }
        return request;
    },

    async create(input, ownerId) {
        if (!ownerId) {
            throw new AppError(401, "AUTH_REQUIRED", "Owner ID is required to save a request.");
        }

        const collectionId = input.collectionId ? String(input.collectionId) : null;
        const folderId = input.folderId ? String(input.folderId) : null;

        let name = (input.name || "").trim();

        // If no user-defined name is provided, or if an untracked default "Untitled Request"
        // name is supplied without an explicit user-defined override, automatically assign
        // a scoped unique display name (Untitled Request, Untitled Request 2, etc.)
        const isDefaultPattern = !name || /^Untitled Request(?: \d+)?$/i.test(name);
        if (isDefaultPattern && !input.isCustomName) {
            const scopedRequests = await RequestModel.find(
                {
                    ownerId,
                    collectionId: collectionId || null,
                    folderId: folderId || null,
                },
                "name"
            ).lean();

            const existingNames = scopedRequests.map((r) => r.name);
            const nameLower = name.toLowerCase();
            const existsInScope = existingNames.some((n) => (n || "").trim().toLowerCase() === nameLower);

            if (!name || existsInScope) {
                name = getNextUntitledName(existingNames);
            }
        }

        return requestRepository.create({
            ...input,
            name,
            collectionId: collectionId || null,
            folderId: folderId || null,
            ownerId,
        });
    },

    async update(id, input, ownerId) {
        ensureValidObjectId(id, "The requested request does not exist.");
        const updated = await requestRepository.update(id, input, ownerId);
        if (!updated) {
            throw new AppError(404, "REQUEST_NOT_FOUND", "The requested request does not exist.");
        }
        return updated;
    },

    async remove(id, ownerId) {
        ensureValidObjectId(id, "The requested request does not exist.");
        const deleted = await requestRepository.remove(id, ownerId);
        if (!deleted) {
            throw new AppError(404, "REQUEST_NOT_FOUND", "The requested request does not exist.");
        }
        return deleted;
    },

    async send(config, ownerId) {
        let {
            method,
            url,
            queryParams = [],
            headers = [],
            bodyType = "none",
            bodyContent = "",
            timeoutMs = 30000,
            requestId = null,
            name = null,
            collectionId = null,
            folderId = null,
            environmentId = null,
            auth = { type: "none", config: {} },
        } = config;

        let environmentName = null;
        if (environmentId && ownerId && mongoose.isValidObjectId(environmentId)) {
            try {
                const env = await environmentRepository.findById(environmentId, ownerId);
                if (env) {
                    environmentName = env.name;
                    const resolved = resolveRequestConfig(
                        { url, queryParams, headers, bodyContent, auth },
                        env.variables || []
                    );
                    url = resolved.url;
                    queryParams = resolved.queryParams;
                    headers = resolved.headers;
                    bodyContent = resolved.bodyContent;
                    auth = resolved.auth;
                }
            } catch (envErr) {
                console.warn("Could not load environment for variable resolution:", envErr.message);
            }
        }

        // Construct target URL with enabled query params
        let targetUrl;
        try {
            // If url doesn't have protocol, default to http://
            const formattedUrl = url.match(/^https?:\/\//i) ? url : `http://${url}`;
            targetUrl = new URL(formattedUrl);
        } catch {
            throw new AppError(400, "INVALID_URL", "Please provide a valid destination URL.");
        }

        // Append query parameters
        queryParams
            .filter((param) => param && param.enabled !== false && param.key)
            .forEach((param) => {
                targetUrl.searchParams.append(param.key, param.value ?? "");
            });

        // Prepare request headers
        const requestHeaders = new Headers();
        headers
            .filter((h) => h && h.enabled !== false && h.key)
            .forEach((h) => {
                requestHeaders.set(h.key, h.value ?? "");
            });

        // Apply Authentication (Bearer, Basic, API Key)
        if (auth && auth.type && auth.type !== "none" && auth.type !== "inherit") {
            const authConfig = auth.config || {};
            if (auth.type === "bearer") {
                const token = (authConfig.token || "").trim();
                if (token) {
                    requestHeaders.set("authorization", `Bearer ${token}`);
                }
            } else if (auth.type === "basic") {
                const username = authConfig.username || "";
                const password = authConfig.password || "";
                if (username || password) {
                    const encoded = Buffer.from(`${username}:${password}`).toString("base64");
                    requestHeaders.set("authorization", `Basic ${encoded}`);
                }
            } else if (auth.type === "apiKey") {
                const key = (authConfig.key || "").trim();
                const value = authConfig.value ?? "";
                const addTo = authConfig.addTo === "queryParams" ? "queryParams" : "header";
                if (key) {
                    if (addTo === "queryParams") {
                        targetUrl.searchParams.append(key, value);
                    } else {
                        requestHeaders.set(key, value);
                    }
                }
            }
        }

        // Prepare request body
        let requestBody = undefined;
        const normalizedMethod = method.toUpperCase();
        const hasBody = !["GET", "HEAD"].includes(normalizedMethod);

        if (hasBody) {
            if (bodyType === "json" && bodyContent) {
                if (!requestHeaders.has("content-type")) {
                    requestHeaders.set("content-type", "application/json");
                }
                requestBody = bodyContent;
            } else if (bodyType === "text" && bodyContent) {
                if (!requestHeaders.has("content-type")) {
                    requestHeaders.set("content-type", "text/plain");
                }
                requestBody = bodyContent;
            } else if (bodyType === "x-www-form-urlencoded" && bodyContent) {
                if (!requestHeaders.has("content-type")) {
                    requestHeaders.set("content-type", "application/x-www-form-urlencoded");
                }
                requestBody = bodyContent;
            }
        }

        // Configure AbortController timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), Math.min(timeoutMs, 60000));

        const startTime = performance.now();
        let result;

        try {
            const response = await fetch(targetUrl.toString(), {
                method: normalizedMethod,
                headers: requestHeaders,
                body: requestBody,
                signal: controller.signal,
                redirect: "follow",
            });

            const endTime = performance.now();
            clearTimeout(timeoutId);

            const durationMs = Math.round(endTime - startTime);
            const responseText = await response.text();
            const sizeBytes = Buffer.byteLength(responseText, "utf8");

            // Extract response headers
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            result = {
                status: response.status,
                statusText: response.statusText || String(response.status),
                headers: responseHeaders,
                body: responseText,
                timeMs: durationMs,
                sizeBytes,
                url: targetUrl.toString(),
            };
        } catch (error) {
            clearTimeout(timeoutId);
            const endTime = performance.now();
            const durationMs = Math.round(endTime - startTime);

            if (error.name === "AbortError") {
                const timeoutPayload = JSON.stringify(
                    {
                        error: "Request Timeout",
                        message: `Request exceeded timeout limit of ${timeoutMs}ms.`,
                        suggestion: "Increase timeout settings or verify target server responsiveness.",
                    },
                    null,
                    2
                );
                result = {
                    status: 408,
                    statusText: "Request Timeout",
                    headers: { "content-type": "application/json" },
                    body: timeoutPayload,
                    timeMs: durationMs,
                    sizeBytes: Buffer.byteLength(timeoutPayload, "utf8"),
                    url: targetUrl.toString(),
                };
            } else {
                const rawMsg = `${error.message || ""} ${error.cause?.code || ""} ${error.cause?.message || ""} ${String(error.cause || "")}`;
                let errorCategory = "Network Error";
                let detailedMessage = error.message || "Failed to dispatch request.";

                if (rawMsg.includes("ECONNREFUSED") || rawMsg.includes("ConnectionRefused")) {
                    errorCategory = "Connection Refused";
                    detailedMessage = `Connection refused by ${targetUrl.host}. Verify target server is active and accessible on that port.`;
                } else if (rawMsg.includes("ENOTFOUND") || rawMsg.includes("getaddrinfo")) {
                    errorCategory = "Host Not Found";
                    detailedMessage = `DNS resolution failed for ${targetUrl.hostname}. Check the domain name spelling or network connection.`;
                } else if (rawMsg.includes("ETIMEDOUT") || rawMsg.includes("timed out")) {
                    errorCategory = "Connection Timed Out";
                    detailedMessage = `Connection to ${targetUrl.host} timed out while waiting for a handshake.`;
                } else if (rawMsg.includes("certificate") || rawMsg.includes("SSL") || rawMsg.includes("TLS")) {
                    errorCategory = "SSL / TLS Error";
                    detailedMessage = `SSL/TLS validation failed for ${targetUrl.host}: ${error.message || rawMsg}`;
                }

                const safeErrorMessage = detailedMessage
                    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]")
                    .replace(/Basic\s+[A-Za-z0-9+/]+=*/gi, "Basic [REDACTED]");

                const errPayload = JSON.stringify(
                    {
                        error: errorCategory,
                        message: safeErrorMessage,
                        url: targetUrl.toString(),
                    },
                    null,
                    2
                );

                result = {
                    status: 502,
                    statusText: "Bad Gateway",
                    headers: { "content-type": "application/json" },
                    body: errPayload,
                    timeMs: durationMs,
                    sizeBytes: Buffer.byteLength(errPayload, "utf8"),
                    url: targetUrl.toString(),
                };
            }
        }

        // Persist history record in MongoDB if ownerId is available
        if (ownerId) {
            try {
                const historyEntry = await historyService.record({
                    ownerId,
                    requestId,
                    name: name || (requestId ? undefined : `${normalizedMethod} ${targetUrl.pathname || "/"}`),
                    collectionId,
                    folderId,
                    environmentId: environmentId || null,
                    environmentName: environmentName || null,
                    requestData: {
                        method: normalizedMethod,
                        url: targetUrl.toString(),
                        queryParams,
                        headers,
                        bodyType,
                        bodyContent,
                        auth: config.auth || auth || { type: "none", config: {} },
                    },
                    responseData: result,
                });
                if (historyEntry) {
                    result.historyId = historyEntry._id;
                    result.executedAt = historyEntry.executedAt;
                }
            } catch (histErr) {
                console.error("Error creating history entry:", histErr.message);
            }
        }

        return result;
    },

    async duplicate(id, ownerId) {
        ensureValidObjectId(id, "The requested request does not exist.");
        const original = await requestRepository.findById(id, ownerId);
        if (!original) {
            throw new AppError(404, "REQUEST_NOT_FOUND", "The requested request does not exist.");
        }
        const { _id, createdAt, updatedAt, ...rest } = original;
        let copyName = `${original.name} (Copy)`;
        let suffix = 1;
        while (await requestRepository.findByName(copyName, null, ownerId)) {
            suffix += 1;
            copyName = `${original.name} (Copy ${suffix})`;
        }
        return requestRepository.create({
            ...rest,
            name: copyName,
            ownerId,
        });
    },

    async move(id, { collectionId = null, folderId = null }, ownerId) {
        ensureValidObjectId(id, "The requested request does not exist.");
        const request = await requestRepository.findById(id, ownerId);
        if (!request) {
            throw new AppError(404, "REQUEST_NOT_FOUND", "The requested request does not exist.");
        }
        return requestRepository.update(
            id,
            {
                collectionId: collectionId || null,
                folderId: folderId || null,
            },
            ownerId,
        );
    },
};

