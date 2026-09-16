import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        description: {
            type: String,
            trim: true,
            default: "",
            maxlength: 1024,
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WorkspaceAccount",
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["personal", "team", "custom"],
            default: "custom",
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

workspaceSchema.index({ ownerId: 1, name: 1 });

export const WorkspaceModel = mongoose.model("Workspace", workspaceSchema);
