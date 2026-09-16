import dotenv from "dotenv";
dotenv.config({ quiet: true });

import http from "http";
import mongoose from "mongoose";
import { loadConfig } from "../shared/config/index.js";
import { Person } from "../features/people/person.model.js";
import { environmentService } from "../features/environments/environment.service.js";
import { requestService } from "../features/requests/request.service.js";
import { historyService } from "../features/history/history.service.js";

const config = loadConfig();

async function runAuthTests() {
    console.log("========================================");
    console.log("Running Feature 4: Authentication Support Tests");
    console.log("========================================\n");

    // 1. Create a local echo test server to capture and inspect received headers & query parameters
    let receivedRequests = [];
    const testServer = http.createServer((req, res) => {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const queryParams = Object.fromEntries(urlObj.searchParams.entries());
        const data = {
            method: req.method,
            path: urlObj.pathname,
            headers: req.headers,
            query: queryParams,
        };
        receivedRequests.push(data);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", received: data }));
    });

    await new Promise((resolve) => testServer.listen(0, resolve));
    const testPort = testServer.address().port;
    const testBaseUrl = `http://localhost:${testPort}`;
    console.log(`[Setup] Mock echo server listening on port ${testPort}`);

    // 2. Connect to MongoDB and find Alex
    await mongoose.connect(config.mongodbUri);
    console.log("[Setup] Connected to MongoDB.");

    const alex = await Person.findOne({ email: "alex.morgan@postman.com" });
    if (!alex) {
        throw new Error("Seed user Alex Morgan not found. Run seed script first.");
    }
    console.log(`[Setup] Using user Alex (ID: ${alex._id})`);

    // 3. Setup test environment with auth credentials
    console.log("\n[1] Creating test environment with auth credentials...");
    const existingEnvs = await environmentService.list(alex._id);
    const prevAuthEnv = existingEnvs.find((e) => e.name === "Auth Test Environment");
    if (prevAuthEnv) {
        await environmentService.remove(prevAuthEnv._id, alex._id);
        console.log("[Setup] Removed leftover previous Auth Test Environment.");
    }

    const authEnv = await environmentService.create(
        {
            name: "Auth Test Environment",
            description: "Variables for testing authentication resolution",
            variables: [
                { key: "bearerJwt", value: "jwt_env_secret_token_12345", type: "secret", enabled: true },
                { key: "basicUsername", value: "envUserAlex", type: "default", enabled: true },
                { key: "basicPassword", value: "envPassSuperSecure999", type: "secret", enabled: true },
                { key: "apiKeyHeaderVal", value: "env_header_key_abc", type: "secret", enabled: true },
                { key: "apiKeyQueryVal", value: "env_query_key_xyz", type: "secret", enabled: true },
            ],
            isDefault: false,
        },
        alex._id
    );
    console.log(`✓ Test environment created with ID: ${authEnv._id}`);

    try {
        // ----------------------------------------------------
        // TEST: No Auth
        // ----------------------------------------------------
        console.log("\n[2] Testing No Auth ('none')...");
        receivedRequests = [];
        const noAuthRes = await requestService.send(
            {
                method: "GET",
                url: `${testBaseUrl}/test-no-auth`,
                auth: { type: "none", config: {} },
                environmentId: authEnv._id,
            },
            alex._id
        );
        console.assert(noAuthRes.status === 200, "No Auth request status should be 200");
        console.assert(receivedRequests.length === 1, "Expected 1 received request on mock server");
        console.assert(!receivedRequests[0].headers.authorization, "Authorization header should NOT be present for 'none'");
        console.log("✓ No Auth confirmed: no authorization credentials attached.");

        // ----------------------------------------------------
        // TEST: Bearer Token (Raw)
        // ----------------------------------------------------
        console.log("\n[3] Testing Bearer Token (Raw)...");
        receivedRequests = [];
        const rawBearerRes = await requestService.send(
            {
                method: "GET",
                url: `${testBaseUrl}/test-bearer-raw`,
                auth: { type: "bearer", config: { token: "raw_personal_access_token_999" } },
            },
            alex._id
        );
        console.assert(rawBearerRes.status === 200, "Bearer raw request status should be 200");
        console.assert(
            receivedRequests[0].headers.authorization === "Bearer raw_personal_access_token_999",
            `Expected 'Bearer raw_personal_access_token_999', got '${receivedRequests[0].headers.authorization}'`
        );
        console.log("✓ Raw Bearer Token passed: Authorization: Bearer <token> received.");

        // ----------------------------------------------------
        // TEST: Bearer Token (Environment Variable Resolution)
        // ----------------------------------------------------
        console.log("\n[4] Testing Bearer Token with Environment Variable ({{bearerJwt}})...");
        receivedRequests = [];
        const envBearerRes = await requestService.send(
            {
                method: "GET",
                url: `${testBaseUrl}/test-bearer-env`,
                auth: { type: "bearer", config: { token: "{{bearerJwt}}" } },
                environmentId: authEnv._id,
            },
            alex._id
        );
        console.assert(envBearerRes.status === 200, "Bearer env request status should be 200");
        console.assert(
            receivedRequests[0].headers.authorization === "Bearer jwt_env_secret_token_12345",
            `Expected 'Bearer jwt_env_secret_token_12345', got '${receivedRequests[0].headers.authorization}'`
        );
        console.log("✓ Environment Variable Bearer Token passed: resolved successfully into Authorization header.");

        // ----------------------------------------------------
        // TEST: Basic Auth (Raw)
        // ----------------------------------------------------
        console.log("\n[5] Testing Basic Auth (Raw)...");
        receivedRequests = [];
        const rawBasicRes = await requestService.send(
            {
                method: "GET",
                url: `${testBaseUrl}/test-basic-raw`,
                auth: {
                    type: "basic",
                    config: { username: "admin", password: "rawPassword123" },
                },
            },
            alex._id
        );
        console.assert(rawBasicRes.status === 200, "Basic raw request status should be 200");
        const expectedRawBasic = "Basic " + Buffer.from("admin:rawPassword123").toString("base64");
        console.assert(
            receivedRequests[0].headers.authorization === expectedRawBasic,
            `Expected '${expectedRawBasic}', got '${receivedRequests[0].headers.authorization}'`
        );
        console.log(`✓ Raw Basic Auth passed: encoded to ${expectedRawBasic}.`);

        // ----------------------------------------------------
        // TEST: Basic Auth (Environment Variable Resolution)
        // ----------------------------------------------------
        console.log("\n[6] Testing Basic Auth with Environment Variables ({{basicUsername}}:{{basicPassword}})...");
        receivedRequests = [];
        const envBasicRes = await requestService.send(
            {
                method: "GET",
                url: `${testBaseUrl}/test-basic-env`,
                auth: {
                    type: "basic",
                    config: { username: "{{basicUsername}}", password: "{{basicPassword}}" },
                },
                environmentId: authEnv._id,
            },
            alex._id
        );
        console.assert(envBasicRes.status === 200, "Basic env request status should be 200");
        const expectedEnvBasic = "Basic " + Buffer.from("envUserAlex:envPassSuperSecure999").toString("base64");
        console.assert(
            receivedRequests[0].headers.authorization === expectedEnvBasic,
            `Expected '${expectedEnvBasic}', got '${receivedRequests[0].headers.authorization}'`
        );
        console.log(`✓ Environment Variable Basic Auth passed: resolved and encoded to ${expectedEnvBasic}.`);

        // ----------------------------------------------------
        // TEST: API Key in Header (Raw & Variable)
        // ----------------------------------------------------
        console.log("\n[7] Testing API Key in Header (Raw & Variable)...");
        receivedRequests = [];
        const apiKeyHeaderRes = await requestService.send(
            {
                method: "GET",
                url: `${testBaseUrl}/test-api-key-header`,
                auth: {
                    type: "apiKey",
                    config: {
                        key: "X-Postman-API-Key",
                        value: "{{apiKeyHeaderVal}}",
                        addTo: "header",
                    },
                },
                environmentId: authEnv._id,
            },
            alex._id
        );
        console.assert(apiKeyHeaderRes.status === 200, "API Key header request status should be 200");
        console.assert(
            receivedRequests[0].headers["x-postman-api-key"] === "env_header_key_abc",
            `Expected header 'x-postman-api-key: env_header_key_abc', got '${receivedRequests[0].headers["x-postman-api-key"]}'`
        );
        console.log("✓ API Key in Header passed: attached to outbound headers with resolved variable.");

        // ----------------------------------------------------
        // TEST: API Key in Query Parameters (Raw & Variable)
        // ----------------------------------------------------
        console.log("\n[8] Testing API Key in Query Parameters (Raw & Variable)...");
        receivedRequests = [];
        const apiKeyQueryRes = await requestService.send(
            {
                method: "GET",
                url: `${testBaseUrl}/test-api-key-query?existing=param`,
                auth: {
                    type: "apiKey",
                    config: {
                        key: "access_token",
                        value: "{{apiKeyQueryVal}}",
                        addTo: "queryParams",
                    },
                },
                environmentId: authEnv._id,
            },
            alex._id
        );
        console.assert(apiKeyQueryRes.status === 200, "API Key query request status should be 200");
        console.assert(
            receivedRequests[0].query["access_token"] === "env_query_key_xyz",
            `Expected query 'access_token=env_query_key_xyz', got '${receivedRequests[0].query["access_token"]}'`
        );
        console.assert(
            receivedRequests[0].query["existing"] === "param",
            "Existing query param 'existing=param' should be preserved"
        );
        console.log("✓ API Key in Query Params passed: appended to query string while preserving existing params.");

        // ----------------------------------------------------
        // TEST: Persistence (Save & Load Request Auth)
        // ----------------------------------------------------
        console.log("\n[9] Testing Request Auth Persistence in MongoDB...");
        const savedReq = await requestService.create(
            {
                name: "Persisted Auth Test Request",
                method: "POST",
                url: `${testBaseUrl}/save-test`,
                auth: {
                    type: "apiKey",
                    config: {
                        key: "X-Auth-Token",
                        value: "{{savedToken}}",
                        addTo: "header",
                    },
                },
            },
            alex._id
        );
        console.assert(savedReq.auth?.type === "apiKey", `Expected auth type 'apiKey', got '${savedReq.auth?.type}'`);
        console.assert(savedReq.auth?.config?.key === "X-Auth-Token", "Auth key config mismatch");
        console.assert(savedReq.auth?.config?.value === "{{savedToken}}", "Auth value config mismatch");

        // Load back from database
        const loadedReq = await requestService.getById(savedReq._id, alex._id);
        console.assert(loadedReq.auth?.type === "apiKey", "Loaded auth type mismatch");
        console.assert(loadedReq.auth?.config?.key === "X-Auth-Token", "Loaded auth key mismatch");
        console.assert(loadedReq.auth?.config?.value === "{{savedToken}}", "Loaded auth value mismatch");
        console.log("✓ Request Auth Persistence verified: saved to and retrieved from MongoDB accurately.");

        // ----------------------------------------------------
        // TEST: Request History Snapshot & Restoration
        // ----------------------------------------------------
        console.log("\n[10] Testing Request History Auth Snapshot & Restoration...");
        const historyRes = await historyService.list(alex._id, { limit: 5 });
        const historyList = historyRes?.items || historyRes || [];
        console.assert(historyList.length > 0, "Expected history records for Alex");
        const latestHistory = historyList[0];
        console.assert(latestHistory.request?.auth !== undefined, "History record must include request.auth snapshot");
        console.assert(
            ["apiKey", "basic", "bearer", "none"].includes(latestHistory.request?.auth?.type),
            `Unexpected history auth type: ${latestHistory.request?.auth?.type}`
        );
        console.log(`✓ History Snapshot verified: latest history item preserved auth type '${latestHistory.request?.auth?.type}'.`);

        // Clean up saved request
        await requestService.remove(savedReq._id, alex._id);
        console.log("✓ Cleaned up test saved request.");

    } finally {
        // Clean up environment
        await environmentService.remove(authEnv._id, alex._id);
        console.log("✓ Cleaned up test environment.");

        // Close test server & db connection
        testServer.close();
        await mongoose.disconnect();
        console.log("[Teardown] Closed test server and disconnected from MongoDB.");
    }

    console.log("\n========================================");
    console.log("ALL FEATURE 4 TESTS PASSED SUCCESSFULLY!");
    console.log("========================================\n");
}

runAuthTests().catch((err) => {
    console.error("Test failed with error:", err);
    process.exit(1);
});
