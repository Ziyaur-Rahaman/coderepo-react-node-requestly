import mongoose from "mongoose";
import { AppError } from "../../shared/errors/app-error.js";
import { collectionRepository } from "./collection.repository.js";
import { FolderModel } from "./folder.model.js";
import { RequestModel } from "../requests/request.model.js";

function ensureValidObjectId(id, message = "The requested resource does not exist.") {
    if (!mongoose.isValidObjectId(id)) {
        throw new AppError(404, "NOT_FOUND", message);
    }
}

export const collectionService = {
    async list(ownerId) {
        return collectionRepository.listCollections(ownerId);
    },

    async getTree(ownerId) {
        // Fetch all collections, folders, and requests for this owner concurrently
        const [collections, folders, requests] = await Promise.all([
            collectionRepository.listCollections(ownerId),
            FolderModel_listAll(ownerId),
            RequestModel.find({ ownerId }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
        ]);

        // Map requests to folders and collections
        const requestsByFolder = new Map();
        const rootRequestsByCollection = new Map();
        const uncategorizedRequests = [];

        for (const req of requests) {
            if (req.folderId) {
                const fId = req.folderId.toString();
                if (!requestsByFolder.has(fId)) requestsByFolder.set(fId, []);
                requestsByFolder.get(fId).push(req);
            } else if (req.collectionId) {
                const cId = req.collectionId.toString();
                if (!rootRequestsByCollection.has(cId)) rootRequestsByCollection.set(cId, []);
                rootRequestsByCollection.get(cId).push(req);
            } else {
                uncategorizedRequests.push(req);
            }
        }

        // Map folders to collections
        const foldersByCollection = new Map();
        for (const folder of folders) {
            const cId = folder.collectionId.toString();
            if (!foldersByCollection.has(cId)) foldersByCollection.set(cId, []);
            foldersByCollection.get(cId).push({
                ...folder,
                requests: requestsByFolder.get(folder._id.toString()) || [],
            });
        }

        // Build collection nodes
        const treeCollections = collections.map((coll) => {
            const cId = coll._id.toString();
            return {
                ...coll,
                folders: foldersByCollection.get(cId) || [],
                requests: rootRequestsByCollection.get(cId) || [],
            };
        });

        return {
            collections: treeCollections,
            uncategorizedRequests,
        };
    },

    async getById(id, ownerId) {
        ensureValidObjectId(id, "Collection not found.");
        const collection = await collectionRepository.findCollectionById(id, ownerId);
        if (!collection) {
            throw new AppError(404, "COLLECTION_NOT_FOUND", "Collection not found.");
        }
        return collection;
    },

    async create(input, ownerId) {
        if (!ownerId) {
            throw new AppError(401, "AUTH_REQUIRED", "Owner ID required.");
        }
        const existing = await collectionRepository.findCollectionByName(input.name, null, ownerId);
        if (existing) {
            throw new AppError(409, "COLLECTION_EXISTS", "A collection with this name already exists.");
        }
        return collectionRepository.createCollection({ ...input, ownerId });
    },

    async update(id, input, ownerId) {
        ensureValidObjectId(id, "Collection not found.");
        const collection = await collectionRepository.findCollectionById(id, ownerId);
        if (!collection) {
            throw new AppError(404, "COLLECTION_NOT_FOUND", "Collection not found.");
        }
        if (input.name && input.name !== collection.name) {
            const existing = await collectionRepository.findCollectionByName(input.name, id, ownerId);
            if (existing) {
                throw new AppError(409, "COLLECTION_EXISTS", "A collection with this name already exists.");
            }
        }
        return collectionRepository.updateCollection(id, input, ownerId);
    },

    async delete(id, ownerId) {
        ensureValidObjectId(id, "Collection not found.");
        const collection = await collectionRepository.findCollectionById(id, ownerId);
        if (!collection) {
            throw new AppError(404, "COLLECTION_NOT_FOUND", "Collection not found.");
        }

        // Cascade delete: requests, folders, then collection
        await Promise.all([
            RequestModel.deleteMany({ collectionId: id, ownerId }),
            collectionRepository.removeFoldersByCollection(id, ownerId),
        ]);

        return collectionRepository.removeCollection(id, ownerId);
    },

    async duplicate(id, ownerId) {
        ensureValidObjectId(id, "Collection not found.");
        const original = await collectionRepository.findCollectionById(id, ownerId);
        if (!original) {
            throw new AppError(404, "COLLECTION_NOT_FOUND", "Collection not found.");
        }

        // 1. Clone collection
        let copyName = `${original.name} (Copy)`;
        let suffix = 1;
        while (await collectionRepository.findCollectionByName(copyName, null, ownerId)) {
            suffix += 1;
            copyName = `${original.name} (Copy ${suffix})`;
        }

        const newCollection = await collectionRepository.createCollection({
            name: copyName,
            description: original.description,
            auth: original.auth,
            ownerId,
            sortOrder: (original.sortOrder || 0) + 1,
        });

        // 2. Clone folders
        const originalFolders = await collectionRepository.listFoldersByCollection(id, ownerId);
        const folderIdMap = new Map();

        for (const f of originalFolders) {
            const clonedFolder = await collectionRepository.createFolder({
                name: f.name,
                description: f.description,
                collectionId: newCollection._id,
                ownerId,
                sortOrder: f.sortOrder,
            });
            folderIdMap.set(f._id.toString(), clonedFolder._id);
        }

        // 3. Clone requests
        const originalRequests = await RequestModel.find({ collectionId: id, ownerId }).lean();
        if (originalRequests.length > 0) {
            const clonedRequests = originalRequests.map((r) => {
                const { _id, createdAt, updatedAt, ...rest } = r;
                return {
                    ...rest,
                    collectionId: newCollection._id,
                    folderId: r.folderId ? folderIdMap.get(r.folderId.toString()) || null : null,
                    ownerId,
                };
            });
            await RequestModel.insertMany(clonedRequests);
        }

        return newCollection;
    },

    // --- Folder operations ---
    async listFolders(collectionId, ownerId) {
        ensureValidObjectId(collectionId, "Collection not found.");
        return collectionRepository.listFoldersByCollection(collectionId, ownerId);
    },

    async createFolder(collectionId, input, ownerId) {
        ensureValidObjectId(collectionId, "Collection not found.");
        const collection = await collectionRepository.findCollectionById(collectionId, ownerId);
        if (!collection) {
            throw new AppError(404, "COLLECTION_NOT_FOUND", "Collection not found.");
        }

        const existing = await collectionRepository.findFolderByName(collectionId, input.name, null, ownerId);
        if (existing) {
            throw new AppError(409, "FOLDER_EXISTS", "A folder with this name already exists in this collection.");
        }

        return collectionRepository.createFolder({
            ...input,
            collectionId,
            ownerId,
        });
    },

    async updateFolder(collectionId, folderId, input, ownerId) {
        ensureValidObjectId(collectionId, "Collection not found.");
        ensureValidObjectId(folderId, "Folder not found.");

        const folder = await collectionRepository.findFolderById(folderId, ownerId);
        if (!folder || folder.collectionId.toString() !== collectionId) {
            throw new AppError(404, "FOLDER_NOT_FOUND", "Folder not found in this collection.");
        }

        if (input.name && input.name !== folder.name) {
            const existing = await collectionRepository.findFolderByName(collectionId, input.name, folderId, ownerId);
            if (existing) {
                throw new AppError(409, "FOLDER_EXISTS", "A folder with this name already exists in this collection.");
            }
        }

        return collectionRepository.updateFolder(folderId, input, ownerId);
    },

    async deleteFolder(collectionId, folderId, ownerId) {
        ensureValidObjectId(collectionId, "Collection not found.");
        ensureValidObjectId(folderId, "Folder not found.");

        const folder = await collectionRepository.findFolderById(folderId, ownerId);
        if (!folder || folder.collectionId.toString() !== collectionId) {
            throw new AppError(404, "FOLDER_NOT_FOUND", "Folder not found in this collection.");
        }

        // Cascade delete requests in folder
        await RequestModel.deleteMany({ folderId, ownerId });
        return collectionRepository.removeFolder(folderId, ownerId);
    },

    async duplicateFolder(collectionId, folderId, ownerId) {
        ensureValidObjectId(collectionId, "Collection not found.");
        ensureValidObjectId(folderId, "Folder not found.");

        const folder = await collectionRepository.findFolderById(folderId, ownerId);
        if (!folder || folder.collectionId.toString() !== collectionId) {
            throw new AppError(404, "FOLDER_NOT_FOUND", "Folder not found in this collection.");
        }

        let copyName = `${folder.name} (Copy)`;
        let suffix = 1;
        while (await collectionRepository.findFolderByName(collectionId, copyName, null, ownerId)) {
            suffix += 1;
            copyName = `${folder.name} (Copy ${suffix})`;
        }

        const newFolder = await collectionRepository.createFolder({
            name: copyName,
            description: folder.description,
            collectionId,
            ownerId,
            sortOrder: (folder.sortOrder || 0) + 1,
        });

        // Clone requests in this folder
        const requests = await RequestModel.find({ folderId, ownerId }).lean();
        if (requests.length > 0) {
            const clonedRequests = requests.map((r) => {
                const { _id, createdAt, updatedAt, ...rest } = r;
                return {
                    ...rest,
                    collectionId,
                    folderId: newFolder._id,
                    ownerId,
                };
            });
            await RequestModel.insertMany(clonedRequests);
        }

        return newFolder;
    },
};

// Helper for fetching all folders for an owner
function FolderModel_listAll(ownerId) {
    return FolderModel.find({ ownerId }).sort({ sortOrder: 1, createdAt: 1 }).lean();
}
