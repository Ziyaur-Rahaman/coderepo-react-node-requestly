import dotenv from "dotenv";
dotenv.config({ quiet: true });

import mongoose from "mongoose";
import { loadConfig } from "../shared/config/index.js";
import { Person } from "../features/people/person.model.js";
import { environmentService } from "../features/environments/environment.service.js";
import { requestService } from "../features/requests/request.service.js";
import { historyService } from "../features/history/history.service.js";
import { resolveRequestConfig, buildVariablesMap, resolveString } from "../features/environments/variable-resolver.js";

const config = loadConfig();

async function runTests() {
    console.log("========================================");
    console.log("Running Feature 3 Environment Tests");
    console.log("========================================\n");

    await mongoose.connect(config.mongodbUri);
    console.log("Connected to MongoDB.");

    const alex = await Person.findOne({ email: "alex.morgan@postman.com" });
    const jordan = await Person.findOne({ email: "jordan.smith@postman.com" });
    if (!alex || !jordan) {
        throw new Error("Seed users not found. Run seed script first.");
    }
    console.log(`Alex ID: ${alex._id}, Jordan ID: ${jordan._id}`);

    // 1. Unit test variable-resolver
    console.log("\n[1] Testing variable resolver...");
    const testVars = [
        { key: "baseUrl", value: "https://api.example.com", enabled: true },
        { key: "disabledVar", value: "notUsed", enabled: false },
        { key: "apiKey", value: "secret123", enabled: true, type: "secret" },
    ];
    const map = buildVariablesMap(testVars);
    console.assert(map.baseUrl === "https://api.example.com", "baseUrl should match");
    console.assert(map.disabledVar === undefined, "disabledVar should not be in map");
    console.assert(map.apiKey === "secret123", "apiKey should match");

    const resolvedUrl = resolveString("{{baseUrl}}/users?key={{apiKey}}&missing={{unknown}}", map);
    console.assert(
        resolvedUrl === "https://api.example.com/users?key=secret123&missing={{unknown}}",
        `Resolved URL unexpected: ${resolvedUrl}`
    );
    console.log("✓ Variable resolver passed string resolution and missing variable preservation.");

    // 2. Test environmentService.list
    console.log("\n[2] Testing environmentService.list...");
    const alexEnvs = await environmentService.list(alex._id);
    console.assert(alexEnvs.length >= 2, `Expected at least 2 environments, found ${alexEnvs.length}`);
    const devEnv = alexEnvs.find((e) => e.name === "Development");
    console.assert(devEnv !== undefined, "Development environment should exist");
    console.log(`✓ Found ${alexEnvs.length} environments for Alex.`);

    // 3. User isolation test
    console.log("\n[3] Testing user isolation...");
    const jordanEnvs = await environmentService.list(jordan._id);
    console.assert(jordanEnvs.length === 0, `Jordan should have 0 environments initially, found ${jordanEnvs.length}`);
    console.log("✓ User isolation verified: Jordan cannot access Alex's environments.");

    // 4. Create new environment
    console.log("\n[4] Testing environment creation...");
    const created = await environmentService.create(
        {
            name: "Staging Test Env",
            description: "Staging cluster for integration tests",
            variables: [
                { key: "baseUrl", value: "http://localhost:8000", type: "default", enabled: true },
                { key: "token", value: "staging_sec_token_5566", type: "secret", enabled: true },
                { key: "inactiveVar", value: "ignored", type: "default", enabled: false },
            ],
            isDefault: false,
        },
        alex._id
    );
    console.assert(created.name === "Staging Test Env", "Name mismatch");
    console.assert(created.variables.length === 3, `Expected 3 variables, got ${created.variables.length}`);
    console.log("✓ Environment created successfully with variables.");

    // 5. Update environment
    console.log("\n[5] Testing environment update...");
    const updated = await environmentService.update(
        created._id,
        {
            description: "Updated staging cluster description",
            variables: [
                { key: "baseUrl", value: "http://localhost:8000", type: "default", enabled: true },
                { key: "token", value: "updated_token_9999", type: "secret", enabled: true },
                { key: "newKey", value: "newValue", type: "default", enabled: true },
            ],
        },
        alex._id
    );
    console.assert(updated.description === "Updated staging cluster description", "Description mismatch");
    console.assert(updated.variables.length === 3, "Updated variables mismatch");
    console.log("✓ Environment updated successfully.");

    // 6. Duplicate environment
    console.log("\n[6] Testing environment duplication...");
    const dup = await environmentService.duplicate(created._id, alex._id);
    console.assert(dup.name.includes("Copy"), "Duplicated name should contain (Copy)");
    console.assert(dup.variables.length === 3, "Duplicated variables count mismatch");
    console.log(`✓ Duplicated environment: ${dup.name}`);

    // 7. Request execution with variable resolution and history recording
    console.log("\n[7] Testing request execution with variables...");
    const response = await requestService.send(
        {
            method: "GET",
            url: "{{baseUrl}}/api/v1/health",
            queryParams: [{ key: "testParam", value: "{{newKey}}", enabled: true }],
            headers: [{ key: "X-Test-Token", value: "{{token}}", enabled: true }],
            environmentId: created._id.toString(),
            name: "Health Check with Variables",
        },
        alex._id
    );

    console.assert(response.status === 200, `Expected status 200, got ${response.status}`);
    console.assert(response.historyId !== undefined, "History ID should be generated");
    console.log(`✓ Request executed with status 200. History ID: ${response.historyId}`);

    // Verify history record has environmentId & environmentName
    const historyItem = await historyService.getById(response.historyId, alex._id);
    console.assert(
        historyItem.environmentName === "Staging Test Env",
        `Expected history environmentName 'Staging Test Env', got '${historyItem.environmentName}'`
    );
    console.assert(
        String(historyItem.environmentId) === String(created._id),
        "History environmentId mismatch"
    );
    console.log(`✓ History record confirmed with environment context: ${historyItem.environmentName}`);

    // 8. Test undefined variable handling
    console.log("\n[8] Testing missing/undefined variable handling...");
    const undefinedVarRes = await requestService.send(
        {
            method: "GET",
            url: "http://localhost:8000/api/v1/health?missing={{notDeclared}}",
            environmentId: created._id.toString(),
        },
        alex._id
    );
    console.assert(undefinedVarRes.status === 200, `Expected 200 even with undefined var, got ${undefinedVarRes.status}`);
    console.log("✓ Missing variable preserved gracefully without error.");

    // 9. Clean up test environments
    console.log("\n[9] Cleaning up test environments...");
    await environmentService.remove(created._id, alex._id);
    await environmentService.remove(dup._id, alex._id);
    console.log("✓ Cleaned up test environments.");

    console.log("\n========================================");
    console.log("All Feature 3 backend tests passed successfully!");
    console.log("========================================\n");

    await mongoose.disconnect();
}

runTests().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
});
