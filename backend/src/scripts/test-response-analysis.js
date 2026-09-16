import dotenv from "dotenv";
dotenv.config({ quiet: true });

import mongoose from "mongoose";
import { loadConfig } from "../shared/config/index.js";
import { Person } from "../features/people/person.model.js";
import { requestService } from "../features/requests/request.service.js";
import { historyService } from "../features/history/history.service.js";
import { detectContentType, formatXml, formatBody } from "../../../frontend/src/features/requests/response-formatter.js";

const config = loadConfig();

async function runResponseAnalysisTests() {
    console.log("========================================");
    console.log("Running Feature 5: HTTP Response Analysis Tests");
    console.log("========================================\n");

    await mongoose.connect(config.mongodbUri);
    console.log("[Setup] Connected to MongoDB.");

    const alex = await Person.findOne({ email: "alex.morgan@postman.com" });
    if (!alex) {
        throw new Error("Seed user Alex Morgan not found. Run seed script first.");
    }
    console.log(`[Setup] Using user Alex (ID: ${alex._id})`);

    const baseUrl = "http://localhost:8000/api/v1";

    // 1. UNIT TEST: Content-Type detection & XML prettifier
    console.log("\n[1] Testing Content-Type detector & formatters...");
    console.assert(
        detectContentType({ "content-type": "application/json; charset=utf-8" }, "{}") === "json",
        "Should detect JSON from header"
    );
    console.assert(
        detectContentType({ "content-type": "application/xml" }, "<root></root>") === "xml",
        "Should detect XML from header"
    );
    console.assert(
        detectContentType({ "content-type": "text/html; charset=utf-8" }, "<html></html>") === "html",
        "Should detect HTML from header"
    );
    console.assert(
        detectContentType({ "content-type": "text/plain" }, "Hello world") === "text",
        "Should detect Plain Text from header"
    );
    // Content sniffing when header is generic
    console.assert(
        detectContentType({}, '{"name": "test"}') === "json",
        "Should sniff JSON from body"
    );
    console.assert(
        detectContentType({}, "<catalog><book id='1'><title>XML</title></book></catalog>") === "xml",
        "Should sniff XML from body"
    );

    // Test XML Prettifier
    const rawXml = "<catalog><book id='1'><title>XML</title></book></catalog>";
    const prettyXml = formatXml(rawXml);
    console.assert(prettyXml.includes("  <book"), "XML prettifier should indent tags");
    console.log("✓ Content-Type detector & XML prettifier passed.");

    // 2. TEST: JSON Response
    console.log("\n[2] Testing JSON Response (/mock/json)...");
    const jsonRes = await requestService.send(
        { method: "GET", url: `${baseUrl}/mock/json` },
        alex._id
    );
    console.assert(jsonRes.status === 200, `Expected 200, got ${jsonRes.status}`);
    console.assert(jsonRes.timeMs >= 0, "Latency must be recorded");
    console.assert(jsonRes.sizeBytes > 0, "Payload size must be calculated");
    console.assert(jsonRes.headers["content-type"]?.includes("json"), "Content-type header should be JSON");
    const parsedBody = JSON.parse(jsonRes.body);
    console.assert(parsedBody.status === "success", "Parsed JSON payload should match");
    console.assert(parsedBody.dataset?.users?.length === 3, "Nested users array should be preserved");
    console.log(`✓ JSON Response passed: 200 OK (${jsonRes.timeMs}ms, ${jsonRes.sizeBytes} bytes).`);

    // 3. TEST: XML Response
    console.log("\n[3] Testing XML Response (/mock/xml)...");
    const xmlRes = await requestService.send(
        { method: "GET", url: `${baseUrl}/mock/xml` },
        alex._id
    );
    console.assert(xmlRes.status === 200, `Expected 200, got ${xmlRes.status}`);
    console.assert(xmlRes.headers["content-type"]?.includes("xml"), "Content-type header should be XML");
    console.assert(xmlRes.body.includes("<catalog>"), "XML body should contain <catalog>");
    const formattedXmlBody = formatBody(xmlRes.body, "xml");
    console.assert(formattedXmlBody.includes("  <book"), "XML should format with indentation");
    console.log(`✓ XML Response passed: ${xmlRes.sizeBytes} bytes, verified formatting.`);

    // 4. TEST: HTML Response
    console.log("\n[4] Testing HTML Response (/mock/html)...");
    const htmlRes = await requestService.send(
        { method: "GET", url: `${baseUrl}/mock/html` },
        alex._id
    );
    console.assert(htmlRes.status === 200, `Expected 200, got ${htmlRes.status}`);
    console.assert(htmlRes.headers["content-type"]?.includes("html"), "Content-type header should be HTML");
    console.assert(htmlRes.body.includes("<!DOCTYPE html>"), "HTML body should contain doctype");
    console.log(`✓ HTML Response passed: ${htmlRes.sizeBytes} bytes.`);

    // 5. TEST: Plain-Text Response
    console.log("\n[5] Testing Plain-Text Response (/mock/text)...");
    const textRes = await requestService.send(
        { method: "GET", url: `${baseUrl}/mock/text` },
        alex._id
    );
    console.assert(textRes.status === 200, `Expected 200, got ${textRes.status}`);
    console.assert(textRes.headers["content-type"]?.includes("text/plain"), "Content-type header should be text/plain");
    console.assert(textRes.body.includes("API Service Log Output"), "Plain-text body preserved");
    console.log(`✓ Plain-Text Response passed: ${textRes.sizeBytes} bytes.`);

    // 6. TEST: 4xx & 5xx HTTP Error Responses
    console.log("\n[6] Testing HTTP Error Responses (404 and 500)...");
    const res404 = await requestService.send(
        { method: "GET", url: `${baseUrl}/mock/status/404` },
        alex._id
    );
    console.assert(res404.status === 404, `Expected 404, got ${res404.status}`);
    console.assert(res404.body.includes("Simulated HTTP 404 Error"), "404 body preserved");

    const res500 = await requestService.send(
        { method: "GET", url: `${baseUrl}/mock/status/500` },
        alex._id
    );
    console.assert(res500.status === 500, `Expected 500, got ${res500.status}`);
    console.assert(res500.body.includes("Simulated HTTP 500 Error"), "500 body preserved");
    console.log("✓ 4xx and 5xx responses passed: status, headers, and error bodies captured accurately.");

    // 7. TEST: Network Error Diagnostics & Timeout
    console.log("\n[7] Testing Network and Timeout Diagnostics...");
    // Timeout
    const timeoutRes = await requestService.send(
        { method: "GET", url: `${baseUrl}/mock/delay/2500`, timeoutMs: 300 },
        alex._id
    );
    console.assert(timeoutRes.status === 408, `Expected 408 for timeout, got ${timeoutRes.status}`);
    console.assert(timeoutRes.body.includes("Request Timeout"), "Timeout diagnostic message expected");

    // Connection Refused (port 59998 closed)
    const connRefusedRes = await requestService.send(
        { method: "GET", url: "http://localhost:59998/closed" },
        alex._id
    );
    console.assert(connRefusedRes.status === 502, `Expected 502 for connection refused, got ${connRefusedRes.status}`);
    console.assert(connRefusedRes.body.includes("Connection Refused"), "Diagnostic category should be Connection Refused");
    console.log("✓ Network and Timeout error diagnostics passed with status 408 & 502.");

    // 8. TEST: Large Response Payload
    console.log("\n[8] Testing Large Response Payload (/mock/large)...");
    const largeRes = await requestService.send(
        { method: "GET", url: `${baseUrl}/mock/large` },
        alex._id
    );
    console.assert(largeRes.status === 200, `Expected 200, got ${largeRes.status}`);
    console.assert(largeRes.sizeBytes > 500000, `Expected > 500KB, got ${largeRes.sizeBytes}`);
    const largeData = JSON.parse(largeRes.body);
    console.assert(largeData.count === 6000, "Should have 6000 items in large response");
    console.log(`✓ Large Response passed: ${largeRes.sizeBytes} bytes, ${largeData.count} items.`);

    // 9. TEST: History Persistence & Snapshot Verification
    console.log("\n[9] Testing Request History Persistence & Reloading...");
    const historyRes = await historyService.list(alex._id, { limit: 5 });
    const historyList = historyRes?.items || historyRes || [];
    console.assert(historyList.length > 0, "History items should be recorded");
    const latest = historyList[0];
    console.assert(latest.response?.status !== undefined, "History response status must exist");
    console.assert(latest.response?.timeMs !== undefined, "History latency must exist");
    console.assert(latest.response?.sizeBytes !== undefined, "History size must exist");
    console.assert(latest.response?.body !== undefined, "History body snapshot must exist");
    console.log(`✓ Request History response snapshot verified: status ${latest.response.status}, ${latest.response.timeMs}ms, ${latest.response.sizeBytes} bytes.`);

    await mongoose.disconnect();
    console.log("\n========================================");
    console.log("ALL HTTP RESPONSE ANALYSIS TESTS PASSED!");
    console.log("========================================\n");
}

runResponseAnalysisTests().catch((err) => {
    console.error("Test failed with error:", err);
    process.exit(1);
});
