import { request } from "../../shared/api/client.js";

export const environmentApi = {
    list: () => request("/environments"),

    get: (id) => request(`/environments/${id}`),

    create: (data) =>
        request("/environments", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    update: (id, data) =>
        request(`/environments/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    delete: (id) =>
        request(`/environments/${id}`, {
            method: "DELETE",
        }),

    duplicate: (id) =>
        request(`/environments/${id}/duplicate`, {
            method: "POST",
        }),
};
