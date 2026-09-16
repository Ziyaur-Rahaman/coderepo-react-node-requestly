import mongoose from "mongoose";

const folderSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        description: { type: String, trim: true, default: "", maxlength: 1024 },
        collectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Collection", required: true, index: true },
        parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null, index: true },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Person", required: true, index: true },
        sortOrder: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

folderSchema.index({ collectionId: 1, parentId: 1, sortOrder: 1 });

export const FolderModel = mongoose.model("Folder", folderSchema);
