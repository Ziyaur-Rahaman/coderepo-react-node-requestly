import assert from "node:assert";
import mongoose from "mongoose";
import { parseCurlCommand, tokenizeCommandLine } from "../../../frontend/src/features/requests/curl-parser.js";
import { requestService } from "../features/requests/request.service.js";
import { collectionService } from "../features/collections/collection.service.js";
import { Person } from "../features/people/person.model.js";
import { loadConfig } from "../shared/config/index.js";

loadConfig();

console.log("========================================");
console.log("Running cURL Import Verification Tests");
console.log("========================================\n");

// [1] GET request
console.log("[1] Testing GET request parsing...");
const curl1 = "curl https://api.example.com/health";
const parsed1 = parseCurlCommand(curl1);
assert.strictEqual(parsed1.method, "GET");
assert.strictEqual(parsed1.url, "https://api.example.com/health");
console.log("✓ GET request parsed successfully.\n");

// [2] POST with JSON body
console.log("[2] Testing POST with JSON body...");
const curl2 = `curl -X POST https://api.example.com/posts -H "Content-Type: application/json" -d '{"title":"Hello","userId":1}'`;
const parsed2 = parseCurlCommand(curl2);
assert.strictEqual(parsed2.method, "POST");
assert.strictEqual(parsed2.bodyType, "json");
assert(parsed2.bodyContent.includes('"title": "Hello"'), "JSON body should be formatted");
console.log("✓ POST with JSON body parsed successfully.\n");

// [3] Query parameters in URL
console.log("[3] Testing Query parameters in URL...");
const curl3 = "curl 'https://api.example.com/users?role=developer&active=true&limit=25'";
const parsed3 = parseCurlCommand(curl3);
assert.strictEqual(parsed3.method, "GET");
assert.strictEqual(parsed3.url, "https://api.example.com/users");
const activeParams = parsed3.queryParams.filter((p) => p.enabled && p.key);
assert.strictEqual(activeParams.length, 3);
assert.strictEqual(activeParams[0].key, "role");
assert.strictEqual(activeParams[0].value, "developer");
assert.strictEqual(activeParams[1].key, "active");
assert.strictEqual(activeParams[1].value, "true");
assert.strictEqual(activeParams[2].key, "limit");
assert.strictEqual(activeParams[2].value, "25");
console.log("✓ Query parameters parsed into parameters table.\n");

// [4] Multiple custom headers
console.log("[4] Testing Multiple custom headers...");
const curl4 = `curl https://api.example.com/data \\
  -H "X-Client-Id: client-xyz-123" \\
  -H "X-Request-Trace: trace-999" \\
  -H "Accept: application/json"`;
const parsed4 = parseCurlCommand(curl4);
const activeHeaders = parsed4.headers.filter((h) => h.enabled && h.key);
assert.strictEqual(activeHeaders.length, 3);
assert(activeHeaders.some((h) => h.key === "X-Client-Id" && h.value === "client-xyz-123"));
assert(activeHeaders.some((h) => h.key === "X-Request-Trace" && h.value === "trace-999"));
assert(activeHeaders.some((h) => h.key === "Accept" && h.value === "application/json"));
console.log("✓ Multiple custom headers extracted accurately.\n");

// [5] Bearer token
console.log("[5] Testing Bearer token authentication...");
const curl5 = `curl https://api.example.com/me -H "Authorization: Bearer jwt-secret-token-abc"`;
const parsed5 = parseCurlCommand(curl5);
assert.strictEqual(parsed5.auth.type, "bearer");
assert.strictEqual(parsed5.auth.config.token, "jwt-secret-token-abc");
// Should not duplicate Authorization header in custom headers table
assert(!parsed5.headers.some((h) => h.key.toLowerCase() === "authorization"));
console.log("✓ Bearer token mapped directly to auth model.\n");

// [6] Basic Auth (via -u flag and header)
console.log("[6] Testing Basic Auth (-u flag)...");
const curl6 = `curl -u "admin:superPassword123" https://api.example.com/admin`;
const parsed6 = parseCurlCommand(curl6);
assert.strictEqual(parsed6.auth.type, "basic");
assert.strictEqual(parsed6.auth.config.username, "admin");
assert.strictEqual(parsed6.auth.config.password, "superPassword123");
console.log("✓ Basic auth extracted accurately.\n");

// [7] Multiline cURL with escaped quotes and backslashes
console.log("[7] Testing Multiline cURL command with line continuations...");
const curl7 = `curl --location 'https://api.example.com/v1/orders' \\
  --request POST \\
  --header 'Content-Type: application/json' \\
  --header 'Authorization: Bearer token-777' \\
  --data-raw '{
    "orderId": "ORD-123",
    "amount": 99.5
  }'`;
const parsed7 = parseCurlCommand(curl7);
assert.strictEqual(parsed7.method, "POST");
assert.strictEqual(parsed7.auth.type, "bearer");
assert.strictEqual(parsed7.bodyType, "json");
assert(parsed7.bodyContent.includes('"orderId": "ORD-123"'));
console.log("✓ Multiline cURL parsed seamlessly.\n");

// [8] Invalid cURL validation errors
console.log("[8] Testing Invalid cURL validation errors...");
assert.throws(() => parseCurlCommand(""), /Please enter a cURL command/);
assert.throws(() => parseCurlCommand("wget https://example.com"), /Command must start with 'curl'/);
assert.throws(() => parseCurlCommand("curl -X POST"), /No destination URL could be found/);
console.log("✓ Validation errors properly thrown for invalid cURL inputs.\n");

// [9] & [10] End-to-End Simulation: Imported Request -> Send & Save to Collection
console.log("[9] & [10] Testing Imported Request -> Send & Save to Collection...");

await mongoose.connect(process.env.MONGODB_URI);
const user = await Person.findOne({ email: "alex.morgan@postman.com" });
assert(user, "User Alex Morgan should exist in DB");

// Simulate importing cURL to our mock echo endpoint
const importedCurl = `curl --location 'http://localhost:8000/api/v1/echo?test=true' \\
  --request POST \\
  --header 'Content-Type: application/json' \\
  --header 'X-Import-Source: cURL' \\
  --header 'Authorization: Bearer test-curl-jwt-token' \\
  --data-raw '{"greeting":"Hello from cURL import"}'`;

const parsedRequest = parseCurlCommand(importedCurl);

// 1. Send simulated imported request
const sendResult = await requestService.send(
    {
        method: parsedRequest.method,
        url: parsedRequest.url,
        queryParams: parsedRequest.queryParams.filter((p) => p.enabled && p.key),
        headers: parsedRequest.headers.filter((h) => h.enabled && h.key),
        bodyType: parsedRequest.bodyType,
        bodyContent: parsedRequest.bodyContent,
        auth: parsedRequest.auth,
    },
    user._id.toString()
);

assert.strictEqual(sendResult.status, 200);
assert.strictEqual(sendResult.statusText, "OK");
console.log("✓ Imported request executed successfully with status 200.");

// 2. Save imported request into an existing collection
const collections = await collectionService.list(user._id.toString());
assert(collections.length > 0, "Alex should have collections");
const targetCollection = collections[0];

const savedRequest = await requestService.create(
    {
        name: parsedRequest.requestName || "Imported Echo Request",
        method: parsedRequest.method,
        url: parsedRequest.url,
        queryParams: parsedRequest.queryParams,
        headers: parsedRequest.headers,
        bodyType: parsedRequest.bodyType,
        bodyContent: parsedRequest.bodyContent,
        auth: parsedRequest.auth,
        collectionId: targetCollection._id.toString(),
    },
    user._id.toString()
);

assert(savedRequest._id, "Request should be saved in DB");
assert.strictEqual(savedRequest.collectionId.toString(), targetCollection._id.toString());
assert.strictEqual(savedRequest.auth.type, "bearer");
assert.strictEqual(savedRequest.auth.config.token, "test-curl-jwt-token");
console.log(`✓ Imported request saved to collection '${targetCollection.name}' with ID: ${savedRequest._id}`);

// Clean up saved test request
await requestService.remove(savedRequest._id.toString(), user._id.toString());
console.log("✓ Cleaned up test saved request.");

await mongoose.disconnect();

console.log("\n========================================");
console.log("ALL 10 cURL IMPORT TESTS PASSED!");
console.log("========================================\n");
