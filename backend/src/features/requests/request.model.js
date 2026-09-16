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

const requestSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        method: {
            type: String,
            required: true,
            enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
            default: "GET",
        },
        url: { type: String, required: true, trim: true, maxlength: 2048 },
        queryParams: [keyValuePairSchema],
        headers: [keyValuePairSchema],
        bodyType: {
            type: String,
            enum: ["none", "json", "text", "form-data", "x-www-form-urlencoded"],
            default: "none",
        },
        bodyContent: { type: String, default: "" },
        auth: {
            type: {
                type: String,
                enum: ["none", "bearer", "basic", "apiKey", "inherit"],
                default: "none",
            },
            config: { type: mongoose.Schema.Types.Mixed, default: {} },
        },
        collectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Collection", default: null },
        folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Person", required: true, index: true },
        sortOrder: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

requestSchema.index({ ownerId: 1, collectionId: 1, name: 1 });

export const RequestModel = mongoose.model("Request", requestSchema);
