import { request } from "../../shared/api/client.js";

export const collectionApi = {
    list: () => request("/collections"),

    tree: () => request("/collections/tree"),

    get: (id) => request(`/collections/${id}`),

    create: (data) =>
        request("/collections", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    update: (id, data) =>
        request(`/collections/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),

    remove: (id) =>
        request(`/collections/${id}`, {
            method: "DELETE",
        }),

    duplicate: (id) =>
        request(`/collections/${id}/duplicate`, {
            method: "POST",
        }),

    // Folder APIs
    listFolders: (collectionId) => request(`/collections/${collectionId}/folders`),

    createFolder: (collectionId, data) =>
        request(`/collections/${collectionId}/folders`, {
            method: "POST",
            body: JSON.stringify(data),
        }),

    updateFolder: (collectionId, folderId, data) =>
        request(`/collections/${collectionId}/folders/${folderId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),

    removeFolder: (collectionId, folderId) =>
        request(`/collections/${collectionId}/folders/${folderId}`, {
            method: "DELETE",
        }),

    duplicateFolder: (collectionId, folderId) =>
        request(`/collections/${collectionId}/folders/${folderId}/duplicate`, {
            method: "POST",
        }),
};
