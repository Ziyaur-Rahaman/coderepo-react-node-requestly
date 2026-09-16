import { EnvironmentModel } from "./environment.model.js";

export const environmentRepository = {
    async list(ownerId) {
        return EnvironmentModel.find({ ownerId })
            .sort({ name: 1, createdAt: 1 })
            .lean();
    },

    async findById(id, ownerId) {
        return EnvironmentModel.findOne({ _id: id, ownerId }).lean();
    },

    async create(data) {
        const doc = await EnvironmentModel.create(data);
        return doc.toObject();
    },

    async update(id, input, ownerId) {
        return EnvironmentModel.findOneAndUpdate(
            { _id: id, ownerId },
            { $set: input },
            { new: true, runValidators: true },
        ).lean();
    },

    async remove(id, ownerId) {
        return EnvironmentModel.findOneAndDelete({ _id: id, ownerId }).lean();
    },

    async findByName(name, ownerId) {
        return EnvironmentModel.findOne({
            ownerId,
            name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        }).lean();
    },

    async setDefault(id, ownerId) {
        await EnvironmentModel.updateMany({ ownerId }, { $set: { isDefault: false } });
        return EnvironmentModel.findOneAndUpdate(
            { _id: id, ownerId },
            { $set: { isDefault: true } },
            { new: true },
        ).lean();
    },
};
