import { CollectionModel } from "./collection.model.js";
import { FolderModel } from "./folder.model.js";

export const collectionRepository = {
    // --- Collections ---
    listCollections: (ownerId) => {
        return CollectionModel.find({ ownerId }).sort({ sortOrder: 1, createdAt: 1 }).lean();
    },

    findCollectionById: (id, ownerId) => {
        const query = { _id: id };
        if (ownerId) query.ownerId = ownerId;
        return CollectionModel.findOne(query).lean();
    },

    findCollectionByName: (name, excludedId, ownerId) => {
        const query = {
            name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
            ownerId,
        };
        if (excludedId) query._id = { $ne: excludedId };
        return CollectionModel.findOne(query).lean();
    },

    createCollection: (input) => CollectionModel.create(input),

    updateCollection: (id, input, ownerId) => {
        const query = { _id: id };
        if (ownerId) query.ownerId = ownerId;
        return CollectionModel.findOneAndUpdate(query, input, { new: true, runValidators: true }).lean();
    },

    removeCollection: (id, ownerId) => {
        const query = { _id: id };
        if (ownerId) query.ownerId = ownerId;
        return CollectionModel.findOneAndDelete(query).lean();
    },

    // --- Folders ---
    listFoldersByCollection: (collectionId, ownerId) => {
        const query = { collectionId };
        if (ownerId) query.ownerId = ownerId;
        return FolderModel.find(query).sort({ sortOrder: 1, createdAt: 1 }).lean();
    },

    findFolderById: (id, ownerId) => {
        const query = { _id: id };
        if (ownerId) query.ownerId = ownerId;
        return FolderModel.findOne(query).lean();
    },

    findFolderByName: (collectionId, name, excludedId, ownerId) => {
        const query = {
            collectionId,
            name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
            ownerId,
        };
        if (excludedId) query._id = { $ne: excludedId };
        return FolderModel.findOne(query).lean();
    },

    createFolder: (input) => FolderModel.create(input),

    updateFolder: (id, input, ownerId) => {
        const query = { _id: id };
        if (ownerId) query.ownerId = ownerId;
        return FolderModel.findOneAndUpdate(query, input, { new: true, runValidators: true }).lean();
    },

    removeFolder: (id, ownerId) => {
        const query = { _id: id };
        if (ownerId) query.ownerId = ownerId;
        return FolderModel.findOneAndDelete(query).lean();
    },

    removeFoldersByCollection: (collectionId, ownerId) => {
        const query = { collectionId };
        if (ownerId) query.ownerId = ownerId;
        return FolderModel.deleteMany(query);
    },

    // --- Housekeeping & Testing ---
    deleteAll: async () => {
        await Promise.all([CollectionModel.deleteMany({}), FolderModel.deleteMany({})]);
    },

    insertManyCollections: (items) => CollectionModel.insertMany(items),
    insertManyFolders: (items) => FolderModel.insertMany(items),
};
