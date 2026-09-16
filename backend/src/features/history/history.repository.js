import { RequestHistoryModel } from "./history.model.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const historyRepository = {
    create: (input) => RequestHistoryModel.create(input),

    list: async (ownerId, { limit = 50, skip = 0, search = "", method = "" } = {}) => {
        const query = { ownerId };

        if (method && method !== "ALL") {
            query["request.method"] = method.toUpperCase();
        }

        if (search) {
            const escaped = escapeRegex(search.trim());
            query.$or = [
                { "request.url": { $regex: escaped, $options: "i" } },
                { name: { $regex: escaped, $options: "i" } },
            ];
        }

        const [items, total] = await Promise.all([
            RequestHistoryModel.find(query)
                .sort({ executedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            RequestHistoryModel.countDocuments(query),
        ]);

        return { items, total };
    },

    findById: (id, ownerId) => {
        const query = { _id: id };
        if (ownerId) query.ownerId = ownerId;
        return RequestHistoryModel.findOne(query).lean();
    },

    deleteById: (id, ownerId) => {
        const query = { _id: id };
        if (ownerId) query.ownerId = ownerId;
        return RequestHistoryModel.findOneAndDelete(query).lean();
    },

    clearAll: (ownerId) => {
        const query = {};
        if (ownerId) query.ownerId = ownerId;
        return RequestHistoryModel.deleteMany(query);
    },

    count: (filter = {}) => RequestHistoryModel.countDocuments(filter),

    deleteAll: () => RequestHistoryModel.deleteMany({}),
};
