import mongoose from "mongoose";

const keyValuePairSchema = new mongoose.Schema(
    {
        key: { type: String, trim: true, default: "" },
        value: { type: String, default: "" },
        description: { type: String, trim: true, default: "" },
        enabled: { type: Boolean, default: true },
    },
    { _id: false },
);

const requestHistorySchema = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Person",
            required: true,
            index: true,
        },
        requestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Request",
            default: null,
            index: true,
        },
        name: {
            type: String,
            trim: true,
            default: "Untitled Request",
            maxlength: 120,
        },
        collectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Collection",
            default: null,
        },
        folderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Folder",
            default: null,
        },
        environmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Environment",
            default: null,
        },
        environmentName: {
            type: String,
            trim: true,
            default: null,
            maxlength: 120,
        },

        // Snapshot of the request that was sent
        request: {
            method: {
                type: String,
                required: true,
                enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
            },
            url: {
                type: String,
                required: true,
                trim: true,
                maxlength: 2048,
            },
            queryParams: [keyValuePairSchema],
            headers: [keyValuePairSchema],
            bodyType: {
                type: String,
                enum: ["none", "json", "text", "form-data", "x-www-form-urlencoded"],
                default: "none",
            },
            bodyContent: {
                type: String,
                default: "",
                maxlength: 500000, // 500KB cap for request body snapshot
            },
            auth: {
                type: {
                    type: String,
                    default: "none",
                },
                config: {
                    type: mongoose.Schema.Types.Mixed,
                    default: {},
                },
            },
        },

        // Snapshot of the response received
        response: {
            status: { type: Number, required: true },
            statusText: { type: String, default: "" },
            headers: { type: mongoose.Schema.Types.Mixed, default: {} },
            body: {
                type: String,
                default: "",
                maxlength: 500000, // 500KB cap to prevent MongoDB document bloat
            },
            timeMs: { type: Number, default: 0 },
            sizeBytes: { type: Number, default: 0 },
            url: { type: String, default: "" },
        },

        executedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        versionKey: false,
    },
);

// Compound indexes for performant chronological history listing
requestHistorySchema.index({ ownerId: 1, executedAt: -1 });
requestHistorySchema.index({ ownerId: 1, "request.method": 1 });

export const RequestHistoryModel = mongoose.model("RequestHistory", requestHistorySchema);
