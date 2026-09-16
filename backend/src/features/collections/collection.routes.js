import { Router } from "express";
import {
    createCollection,
    createFolder,
    deleteCollection,
    deleteFolder,
    duplicateCollection,
    duplicateFolder,
    getCollection,
    getCollectionTree,
    listCollections,
    listFolders,
    updateCollection,
    updateFolder,
} from "./collection.controller.js";

export const collectionRouter = Router();

// Collections
collectionRouter.get("/", listCollections);
collectionRouter.get("/tree", getCollectionTree);
collectionRouter.post("/", createCollection);
collectionRouter.get("/:collectionId", getCollection);
collectionRouter.patch("/:collectionId", updateCollection);
collectionRouter.delete("/:collectionId", deleteCollection);
collectionRouter.post("/:collectionId/duplicate", duplicateCollection);

// Nested folders within collections
collectionRouter.get("/:collectionId/folders", listFolders);
collectionRouter.post("/:collectionId/folders", createFolder);
collectionRouter.patch("/:collectionId/folders/:folderId", updateFolder);
collectionRouter.delete("/:collectionId/folders/:folderId", deleteFolder);
collectionRouter.post("/:collectionId/folders/:folderId/duplicate", duplicateFolder);
