import mongoose from "mongoose";
import assert from "node:assert";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../../.env") });

import { requestService, getNextUntitledName } from "../features/requests/request.service.js";
import { collectionService } from "../features/collections/collection.service.js";
import { Person } from "../features/people/person.model.js";
import { RequestModel } from "../features/requests/request.model.js";

async function runTests() {
    console.log("========================================");
    console.log("Running Request Naming & Scope Tests");
    console.log("========================================");

    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/postman";
    await mongoose.connect(mongoUri);
    console.log("[Setup] Connected to MongoDB.");

    const alexProfile = await Person.findOne();
    assert(alexProfile, "Alex profile should exist.");
    const ownerId = String(alexProfile._id);
    console.log(`[Setup] Using owner ID: ${ownerId}`);

    // Clean up any leftover test collections
    const existingColls = await collectionService.list(ownerId);
    for (const c of existingColls) {
        if (c.name.startsWith("Naming Test Coll")) {
            await collectionService.delete(c._id, ownerId);
        }
    }

    // Clean up any existing test artifacts for this owner
    const createdRequestIds = [];
    const createdCollectionIds = [];

    try {
        // [Unit Test] getNextUntitledName
        console.log("\n[0] Unit Testing getNextUntitledName helper...");
        assert.strictEqual(getNextUntitledName([]), "Untitled Request");
        assert.strictEqual(getNextUntitledName(["Some Name"]), "Untitled Request");
        assert.strictEqual(getNextUntitledName(["Untitled Request"]), "Untitled Request 2");
        assert.strictEqual(getNextUntitledName(["Untitled Request", "Untitled Request 2"]), "Untitled Request 3");
        assert.strictEqual(getNextUntitledName(["Untitled Request", "Untitled Request 3"]), "Untitled Request 2"); // lowest available
        console.log("✓ getNextUntitledName helper passed all unit checks.");

        // [Test 1] Uncategorized Requests (collectionId: null, folderId: null)
        console.log("\n[1] Testing Multiple New Requests in Uncategorized Scope...");
        // Clear any uncategorized requests created during prior testing
        await RequestModel.deleteMany({ ownerId, collectionId: null, folderId: null, name: /^Untitled Request/i });

        const u1 = await requestService.create({ url: "http://localhost:8000/api/v1/health" }, ownerId);
        createdRequestIds.push(u1._id);
        assert.strictEqual(u1.name, "Untitled Request", "First uncategorized request should be 'Untitled Request'");

        const u2 = await requestService.create({ url: "http://localhost:8000/api/v1/health" }, ownerId);
        createdRequestIds.push(u2._id);
        assert.strictEqual(u2.name, "Untitled Request 2", "Second uncategorized request should be 'Untitled Request 2'");

        const u3 = await requestService.create({ url: "http://localhost:8000/api/v1/health" }, ownerId);
        createdRequestIds.push(u3._id);
        assert.strictEqual(u3.name, "Untitled Request 3", "Third uncategorized request should be 'Untitled Request 3'");
        console.log(`✓ Uncategorized scope correctly numbered: '${u1.name}', '${u2.name}', '${u3.name}'`);

        // [Test 2] The same collection
        console.log("\n[2] Testing Multiple New Requests in the Same Collection...");
        const collA = await collectionService.create({ name: "Naming Test Coll A" }, ownerId);
        createdCollectionIds.push(collA._id);

        const c1 = await requestService.create({ collectionId: collA._id, url: "http://localhost:8000/api/v1/health" }, ownerId);
        createdRequestIds.push(c1._id);
        assert.strictEqual(c1.name, "Untitled Request", "First request in collection should be 'Untitled Request'");

        const c2 = await requestService.create({ collectionId: collA._id, url: "http://localhost:8000/api/v1/health" }, ownerId);
        createdRequestIds.push(c2._id);
        assert.strictEqual(c2.name, "Untitled Request 2", "Second request in collection should be 'Untitled Request 2'");

        const c3 = await requestService.create({ collectionId: collA._id, url: "http://localhost:8000/api/v1/health" }, ownerId);
        createdRequestIds.push(c3._id);
        assert.strictEqual(c3.name, "Untitled Request 3", "Third request in collection should be 'Untitled Request 3'");
        console.log(`✓ Same collection scope correctly numbered: '${c1.name}', '${c2.name}', '${c3.name}'`);

        // [Test 3] The same folder
        console.log("\n[3] Testing Multiple New Requests in the Same Folder...");
        const folder1 = await collectionService.createFolder(collA._id, { name: "Test Folder 1" }, ownerId);

        const f1 = await requestService.create({ collectionId: collA._id, folderId: folder1._id, url: "http://localhost:8000/api/v1/health" }, ownerId);
        createdRequestIds.push(f1._id);
        assert.strictEqual(f1.name, "Untitled Request", "First request in folder should be 'Untitled Request'");

        const f2 = await requestService.create({ collectionId: collA._id, folderId: folder1._id, url: "http://localhost:8000/api/v1/health" }, ownerId);
        createdRequestIds.push(f2._id);
        assert.strictEqual(f2.name, "Untitled Request 2", "Second request in folder should be 'Untitled Request 2'");

        const f3 = await requestService.create({ collectionId: collA._id, folderId: folder1._id, url: "http://localhost:8000/api/v1/health" }, ownerId);
        createdRequestIds.push(f3._id);
        assert.strictEqual(f3.name, "Untitled Request 3", "Third request in folder should be 'Untitled Request 3'");
        console.log(`✓ Same folder scope correctly numbered: '${f1.name}', '${f2.name}', '${f3.name}'`);

        // [Test 4] Different collections / folders
        console.log("\n[4] Testing Different Collections & Folders (Independent Scopes)...");
        const collB = await collectionService.create({ name: "Naming Test Coll B" }, ownerId);
        createdCollectionIds.push(collB._id);

        const folder2 = await collectionService.createFolder(collB._id, { name: "Test Folder 2" }, ownerId);

        // First request in Coll B should start independently at "Untitled Request"
        const b1 = await requestService.create({ collectionId: collB._id, url: "http://localhost:8000/api/v1/health" }, ownerId);
        createdRequestIds.push(b1._id);
        assert.strictEqual(b1.name, "Untitled Request", "First request in new Collection B must be 'Untitled Request'");

        // First request in Folder 2 should start independently at "Untitled Request"
        const f2_1 = await requestService.create({ collectionId: collB._id, folderId: folder2._id, url: "http://localhost:8000/api/v1/health" }, ownerId);
        createdRequestIds.push(f2_1._id);
        assert.strictEqual(f2_1.name, "Untitled Request", "First request in new Folder 2 must be 'Untitled Request'");
        console.log(`✓ Different collections and folders start at independent numbering: Coll B='${b1.name}', Folder 2='${f2_1.name}'`);

        // [Test 5] Multiple requests with the same user-defined name
        console.log("\n[5] Testing Multiple Requests with Identical User-Defined Names...");
        const custom1 = await requestService.create({
            name: "Get User Profile",
            isCustomName: true,
            collectionId: collA._id,
            url: "http://localhost:8000/api/v1/health",
        }, ownerId);
        createdRequestIds.push(custom1._id);

        const custom2 = await requestService.create({
            name: "Get User Profile",
            isCustomName: true,
            collectionId: collA._id,
            url: "http://localhost:8000/api/v1/health",
        }, ownerId);
        createdRequestIds.push(custom2._id);

        assert.strictEqual(custom1.name, "Get User Profile");
        assert.strictEqual(custom2.name, "Get User Profile");
        assert.notStrictEqual(String(custom1._id), String(custom2._id), "Request IDs must remain unique");
        console.log("✓ Multiple requests with identical custom names allowed and unique IDs preserved.");

        // [Test 6] Preserving Explicit Rename
        console.log("\n[6] Testing Preserving Explicit Rename without Auto-renumbering...");
        const renamed = await requestService.update(u2._id, { name: "Untitled Request" }, ownerId);
        assert.strictEqual(renamed.name, "Untitled Request", "Explicit rename must not be renumbered");
        console.log("✓ Explicit rename preserved accurately.");

    } finally {
        console.log("\n[Teardown] Cleaning up test data...");
        if (createdRequestIds.length > 0) {
            await RequestModel.deleteMany({ _id: { $in: createdRequestIds } });
        }
        for (const collId of createdCollectionIds) {
            await collectionService.delete(collId, ownerId);
        }
        await mongoose.disconnect();
        console.log("[Teardown] Disconnected from MongoDB.");
    }

    console.log("\n========================================");
    console.log("ALL REQUEST NAMING TESTS PASSED (100%)!");
    console.log("========================================");
}

runTests().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
});
