import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        description: { type: String, trim: true, default: "", maxlength: 1024 },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Person", required: true, index: true },
        sortOrder: { type: Number, default: 0 },
        auth: {
            type: {
                type: String,
                enum: ["none", "bearer", "basic", "apiKey"],
                default: "none",
            },
            config: { type: mongoose.Schema.Types.Mixed, default: {} },
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

collectionSchema.index({ ownerId: 1, sortOrder: 1, name: 1 });

export const CollectionModel = mongoose.model("Collection", collectionSchema);
