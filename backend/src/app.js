import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { authRouter } from "./features/auth/auth.routes.js";
import { collectionRouter } from "./features/collections/collection.routes.js";
import { environmentRouter } from "./features/environments/environment.routes.js";
import { historyRouter } from "./features/history/history.routes.js";
import { personRouter, profileRouter } from "./features/people/person.routes.js";
import { requestRouter } from "./features/requests/request.routes.js";
import { workspaceRouter } from "./features/workspaces/workspace.routes.js";
import { errorHandler, notFoundHandler } from "./shared/middleware/error-handler.js";
import { resolveProfileContext } from "./shared/middleware/profile-context.js";
import { requireWorkspaceAuth } from "./shared/middleware/auth.js";

const publicDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");

export function createApp() {
    const app = express();
    app.disable("x-powered-by");
    app.use(cors());
    app.use(express.json({ limit: "500kb" }));
    app.use(express.static(publicDirectory));

    // Health check endpoint validating active MongoDB connection
    app.get("/api/v1/health", (request, response) => {
        const database = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
        response.status(database === "connected" ? 200 : 503).json({
            data: {
                status: database === "connected" ? "ok" : "degraded",
                database,
            },
        });
    });

    // Public echo endpoint for local testing of headers, auth, query params, and body
    app.all("/api/v1/echo", (request, response) => {
        response.status(200).json({
            method: request.method,
            headers: request.headers,
            query: request.query,
            body: request.body,
        });
    });

    // Public mock endpoints for testing HTTP Response Analysis across formats and statuses
    app.get("/api/v1/mock/json", (request, response) => {
        response.setHeader("Content-Type", "application/json");
        response.status(200).json({
            status: "success",
            timestamp: new Date().toISOString(),
            dataset: {
                totalCount: 3,
                active: true,
                rating: 4.85,
                metadata: null,
                users: [
                    { id: 101, name: "Alex Morgan", role: "Administrator", permissions: ["read", "write", "delete"] },
                    { id: 102, name: "Jordan Smith", role: "Developer", permissions: ["read", "write"] },
                    { id: 103, name: "Taylor Johnson", role: "Analyst", permissions: ["read"] },
                ],
                settings: {
                    theme: "dark",
                    notifications: { email: true, push: false, frequency: "daily" },
                    limits: { maxRequestsPerMin: 120, maxPayloadBytes: 5242880 },
                },
            },
        });
    });

    app.get("/api/v1/mock/xml", (request, response) => {
        response.setHeader("Content-Type", "application/xml; charset=utf-8");
        const xml = `<?xml version="1.0" encoding="UTF-8"?><catalog><book id="bk101"><author>Gambardella, Matthew</author><title>XML Developer's Guide</title><genre>Computer</genre><price>44.95</price><publish_date>2000-10-01</publish_date><description>An in-depth look at creating applications with XML.</description></book><book id="bk102"><author>Ralls, Kim</author><title>Midnight Rain</title><genre>Fantasy</genre><price>5.95</price><publish_date>2000-12-16</publish_date><description>A former architect battles an evil sorceress.</description></book></catalog>`;
        response.status(200).send(xml);
    });

    app.get("/api/v1/mock/html", (request, response) => {
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Mock Service Status</title><style>body{font-family:sans-serif;padding:30px;background:#18191a;color:#e3e3e3;}h1{color:#8ab4f8;}.card{background:#242526;padding:20px;border-radius:8px;border:1px solid #3a3b3c;}</style></head><body><h1>API Service Status</h1><div class="card"><h2>All Systems Operational</h2><p>Gateway latency: 12ms | Cluster: us-east-1</p><ul><li>Authentication Service: Online</li><li>Storage Engine: Healthy</li><li>Job Queue: 0 pending</li></ul></div></body></html>`;
        response.status(200).send(html);
    });

    app.get("/api/v1/mock/text", (request, response) => {
        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.status(200).send("API Service Log Output\n======================\n[INFO] 2026-09-15 14:00:01 Booted worker process #1\n[INFO] 2026-09-15 14:00:02 Connected to cluster db-primary\n[WARN] 2026-09-15 14:00:05 Rate limit ceiling reached for anonymous caller 192.168.1.50\n[SUCCESS] Health check passed.");
    });

    app.get("/api/v1/mock/status/:code", (request, response) => {
        const code = parseInt(request.params.code, 10) || 200;
        response.setHeader("Content-Type", "application/json");
        response.status(code).json({
            status: code,
            error: code >= 400 ? `Simulated HTTP ${code} Error` : null,
            message: `Mock response with HTTP status code ${code}.`,
            timestamp: new Date().toISOString(),
        });
    });

    app.get("/api/v1/mock/delay/:ms", async (request, response) => {
        const ms = Math.min(30000, parseInt(request.params.ms, 10) || 1000);
        await new Promise((res) => setTimeout(res, ms));
        response.setHeader("Content-Type", "application/json");
        response.status(200).json({
            delayedMs: ms,
            message: `Response was delayed by ${ms}ms.`,
            timestamp: new Date().toISOString(),
        });
    });

    app.get("/api/v1/mock/large", (request, response) => {
        response.setHeader("Content-Type", "application/json");
        const items = [];
        for (let i = 1; i <= 6000; i++) {
            items.push({
                id: i,
                uuid: `item-uuid-${i}-abcd-1234-efgh`,
                title: `Resource item number ${i} with extended description text for payload benchmarking`,
                status: i % 2 === 0 ? "completed" : "pending",
                score: Math.round(Math.random() * 1000) / 10,
                tags: ["benchmark", "performance", "payload", `tag-${i % 20}`],
            });
        }
        response.status(200).json({ count: items.length, items });
    });

    // Public auth routes
    app.use("/api/v1/auth", authRouter);

    // Workspace routes
    app.use("/api/v1/workspaces", requireWorkspaceAuth, workspaceRouter);

    // Profile listing routes
    app.use("/api/v1/profiles", requireWorkspaceAuth, profileRouter);

    // Context-scoped routes (require auth and active profile)
    app.use("/api/v1", requireWorkspaceAuth, resolveProfileContext);
    app.use("/api/v1/people", personRouter);
    app.use("/api/v1/requests", requestRouter);
    app.use("/api/v1/collections", collectionRouter);
    app.use("/api/v1/environments", environmentRouter);
    app.use("/api/v1/history", historyRouter);

    // 404 & centralized error handling
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
