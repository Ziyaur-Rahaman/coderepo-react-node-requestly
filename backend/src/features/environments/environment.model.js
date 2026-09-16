import mongoose from "mongoose";

const environmentVariableSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        value: {
            type: String,
            default: "",
            maxlength: 4096,
        },
        type: {
            type: String,
            enum: ["default", "secret"],
            default: "default",
        },
        enabled: {
            type: Boolean,
            default: true,
        },
    },
    { _id: true },
);

const environmentSchema = new mongoose.Schema(
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
            ref: "Person",
            required: true,
            index: true,
        },
        variables: [environmentVariableSchema],
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

environmentSchema.index({ ownerId: 1, name: 1 });

export const EnvironmentModel = mongoose.model("Environment", environmentSchema);
