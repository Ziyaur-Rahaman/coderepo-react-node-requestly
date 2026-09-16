import { request } from "../../shared/api/client.js";

export const requestApi = {
    send: (config) =>
        request("/requests/send", {
            method: "POST",
            body: JSON.stringify(config),
        }),

    list: (collectionId) => {
        const query = collectionId ? `?collectionId=${encodeURIComponent(collectionId)}` : "";
        return request(`/requests${query}`);
    },

    get: (id) => request(`/requests/${id}`),

    create: (data) =>
        request("/requests", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    update: (id, data) =>
        request(`/requests/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),

    remove: (id) =>
        request(`/requests/${id}`, {
            method: "DELETE",
        }),

    duplicate: (id) =>
        request(`/requests/${id}/duplicate`, {
            method: "POST",
        }),

    move: (id, { collectionId, folderId }) =>
        request(`/requests/${id}/move`, {
            method: "PATCH",
            body: JSON.stringify({ collectionId, folderId }),
        }),
};

