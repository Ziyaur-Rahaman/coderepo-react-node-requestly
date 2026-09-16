import { RequestModel } from "./request.model.js";

export const requestRepository = {
    list: (ownerId, collectionId) => {
        const query = { ownerId };
        if (collectionId !== undefined) {
            query.collectionId = collectionId;
        }
        return RequestModel.find(query).sort({ updatedAt: -1 }).lean();
    },

    findById: (id, ownerId) => {
        const query = { _id: id };
        if (ownerId) query.ownerId = ownerId;
        return RequestModel.findOne(query).lean();
    },

    findByName: (name, excludedId, ownerId) => {
        const query = {
            name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
            ownerId,
        };
        if (excludedId) query._id = { $ne: excludedId };
        return RequestModel.findOne(query).lean();
    },

    create: (input) => RequestModel.create(input),

    update: (id, input, ownerId) => {
        const query = { _id: id };
        if (ownerId) query.ownerId = ownerId;
        return RequestModel.findOneAndUpdate(query, input, { new: true, runValidators: true }).lean();
    },

    remove: (id, ownerId) => {
        const query = { _id: id };
        if (ownerId) query.ownerId = ownerId;
        return RequestModel.findOneAndDelete(query).lean();
    },

    deleteAll: () => RequestModel.deleteMany({}),

    insertMany: (items) => RequestModel.insertMany(items),

    count: (filter = {}) => RequestModel.countDocuments(filter),
};
