import dotenv from "dotenv";

dotenv.config({ quiet: true });

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { WorkspaceAccount } from "../features/auth/workspace-account.model.js";
import { CollectionModel } from "../features/collections/collection.model.js";
import { FolderModel } from "../features/collections/folder.model.js";
import { Person } from "../features/people/person.model.js";
import { RequestModel } from "../features/requests/request.model.js";
import { RequestHistoryModel } from "../features/history/history.model.js";
import { EnvironmentModel } from "../features/environments/environment.model.js";
import { loadConfig } from "../shared/config/index.js";
import { demoColorFor } from "../shared/constants/demo-colors.js";

const config = loadConfig();

const DEMO_PASSWORD = "password123";
const PASSWORD_ROUNDS = 12;

const profileRows = [
    {
        name: "Alex Morgan",
        email: "alex.morgan@postman.com",
        avatarColor: demoColorFor("alex.morgan@postman.com"),
        isProfile: true,
        sortOrder: 1,
        timeZone: "UTC",
    },
    {
        name: "Jordan Smith",
        email: "jordan.smith@postman.com",
        avatarColor: demoColorFor("jordan.smith@postman.com"),
        isProfile: true,
        sortOrder: 2,
        timeZone: "UTC",
    },
    {
        name: "Taylor Johnson",
        email: "taylor.johnson@postman.com",
        avatarColor: demoColorFor("taylor.johnson@postman.com"),
        isProfile: true,
        sortOrder: 3,
        timeZone: "UTC",
    },
];

async function clearDatabase() {
    console.log("Clearing existing collections...");
    await Promise.all([
        RequestHistoryModel.deleteMany({}),
        EnvironmentModel.deleteMany({}),
        RequestModel.deleteMany({}),
        FolderModel.deleteMany({}),
        CollectionModel.deleteMany({}),
        Person.deleteMany({}),
        WorkspaceAccount.deleteMany({}),
    ]);
    await Promise.all([
        RequestHistoryModel.syncIndexes(),
        EnvironmentModel.syncIndexes(),
        RequestModel.syncIndexes(),
        FolderModel.syncIndexes(),
        CollectionModel.syncIndexes(),
        Person.syncIndexes(),
        WorkspaceAccount.syncIndexes(),
    ]);
}

async function seedProfiles() {
    console.log("Seeding profiles...");
    return Person.insertMany(profileRows);
}

async function seedAccounts(profiles) {
    console.log("Seeding workspace accounts...");
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, PASSWORD_ROUNDS);
    const accounts = profiles.map((profile) => ({
        name: profile.name,
        email: profile.email,
        passwordHash,
        active: true,
        allowedProfileIds: profiles.map((p) => p._id),
    }));
    return WorkspaceAccount.insertMany(accounts);
}

async function seedCollectionsAndRequests(profiles) {
    console.log("Seeding collections, folders, and initial API requests...");
    const primaryOwner = profiles[0]._id;

    // 1. Create Collections
    const [jsonPlaceholderColl, systemColl] = await CollectionModel.insertMany([
        {
            name: "JSONPlaceholder API",
            description: "Public fake REST API for testing and prototyping",
            ownerId: primaryOwner,
            sortOrder: 1,
        },
        {
            name: "System & Monitoring",
            description: "Local service health check and monitoring endpoints",
            ownerId: primaryOwner,
            sortOrder: 2,
        },
    ]);

    // 2. Create Folders under JSONPlaceholder API
    const [postsFolder, usersFolder] = await FolderModel.insertMany([
        {
            name: "Posts",
            description: "Blog post resources and actions",
            collectionId: jsonPlaceholderColl._id,
            ownerId: primaryOwner,
            sortOrder: 1,
        },
        {
            name: "Users",
            description: "User profiles and directories",
            collectionId: jsonPlaceholderColl._id,
            ownerId: primaryOwner,
            sortOrder: 2,
        },
    ]);

    // 3. Create Requests
    const demoRequests = [
        {
            name: "Get System Health",
            method: "GET",
            url: "http://localhost:8000/api/v1/health",
            queryParams: [],
            headers: [
                { key: "Accept", value: "application/json", description: "JSON format", enabled: true },
            ],
            bodyType: "none",
            bodyContent: "",
            collectionId: systemColl._id,
            folderId: null,
            ownerId: primaryOwner,
            sortOrder: 1,
        },
        {
            name: "Get Users (JSONPlaceholder)",
            method: "GET",
            url: "https://jsonplaceholder.typicode.com/users",
            queryParams: [
                { key: "limit", value: "5", description: "Max results", enabled: true },
            ],
            headers: [
                { key: "Accept", value: "application/json", description: "", enabled: true },
            ],
            bodyType: "none",
            bodyContent: "",
            collectionId: jsonPlaceholderColl._id,
            folderId: usersFolder._id,
            ownerId: primaryOwner,
            sortOrder: 2,
        },
        {
            name: "Create Post (JSONPlaceholder)",
            method: "POST",
            url: "https://jsonplaceholder.typicode.com/posts",
            queryParams: [],
            headers: [
                { key: "Content-Type", value: "application/json", description: "", enabled: true },
                { key: "Accept", value: "application/json", description: "", enabled: true },
            ],
            bodyType: "json",
            bodyContent: JSON.stringify(
                {
                    title: "Requestly Build Test",
                    body: "End-to-end request builder execution",
                    userId: 1,
                },
                null,
                2,
            ),
            collectionId: jsonPlaceholderColl._id,
            folderId: postsFolder._id,
            ownerId: primaryOwner,
            sortOrder: 3,
        },
        {
            name: "Zen Quote (GitHub API)",
            method: "GET",
            url: "https://api.github.com/zen",
            queryParams: [],
            headers: [
                { key: "User-Agent", value: "Requestly-Client", description: "Identifies client", enabled: true },
            ],
            bodyType: "none",
            bodyContent: "",
            collectionId: null,
            folderId: null,
            ownerId: primaryOwner,
            sortOrder: 4,
        },
    ];

    return RequestModel.insertMany(demoRequests);
}

async function seedEnvironments(profiles) {
    console.log("Seeding environments...");
    const primaryOwner = profiles[0]._id;

    const demoEnvironments = [
        {
            name: "Development",
            description: "Local development server with mock API keys and local base URL",
            ownerId: primaryOwner,
            isDefault: true,
            variables: [
                { key: "baseUrl", value: "http://localhost:8000", type: "default", enabled: true },
                { key: "apiKey", value: "dev-postman-sec-key-7788", type: "secret", enabled: true },
                { key: "userId", value: "1", type: "default", enabled: true },
                { key: "version", value: "v1", type: "default", enabled: true },
            ],
        },
        {
            name: "Production",
            description: "Live external API server using JSONPlaceholder and secure tokens",
            ownerId: primaryOwner,
            isDefault: false,
            variables: [
                { key: "baseUrl", value: "https://jsonplaceholder.typicode.com", type: "default", enabled: true },
                { key: "apiKey", value: "prod-live-api-token-9900", type: "secret", enabled: true },
                { key: "userId", value: "2", type: "default", enabled: true },
                { key: "version", value: "v1", type: "default", enabled: true },
            ],
        },
    ];

    return EnvironmentModel.insertMany(demoEnvironments);
}

async function seed() {
    try {
        console.log("========================================");
        console.log("Requestly Database Seeding");
        console.log("========================================\n");

        console.log("Connecting to MongoDB...");
        await mongoose.connect(config.mongodbUri);
        console.log("Connected to MongoDB");

        await clearDatabase();

        const profiles = await seedProfiles();
        await seedAccounts(profiles);
        await seedCollectionsAndRequests(profiles);
        await seedEnvironments(profiles);

        const counts = await Promise.all([
            Person.countDocuments(),
            WorkspaceAccount.countDocuments(),
            CollectionModel.countDocuments(),
            FolderModel.countDocuments(),
            RequestModel.countDocuments(),
            EnvironmentModel.countDocuments(),
        ]);

        console.log("\n========================================");
        console.log("Seeding completed successfully!");
        console.log("========================================");
        console.log("\nEntity counts:");
        console.log(`  Profiles:     ${counts[0]}`);
        console.log(`  Accounts:     ${counts[1]}`);
        console.log(`  Collections:  ${counts[2]}`);
        console.log(`  Folders:      ${counts[3]}`);
        console.log(`  Requests:     ${counts[4]}`);
        console.log(`  Environments: ${counts[5]}`);
        console.log("\nDemo accounts:");
        for (const profile of profiles) {
            console.log(`  Email: ${profile.email} | Password: ${DEMO_PASSWORD}`);
        }
        console.log("========================================\n");
    } catch (error) {
        console.error("\nSeeding failed:", error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
}

seed();
