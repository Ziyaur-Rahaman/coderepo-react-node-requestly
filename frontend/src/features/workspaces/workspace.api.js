import { request } from "../../shared/api/client.js";

export const workspaceApi = {
    list: () => request("/workspaces"),
    create: ({ name, description = "" }) =>
        request("/workspaces", {
            method: "POST",
            body: JSON.stringify({ name, description }),
        }),
    getById: (id) => request(`/workspaces/${id}`),
    update: (id, { name, description }) =>
        request(`/workspaces/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ name, description }),
        }),
    delete: (id) =>
        request(`/workspaces/${id}`, { method: "DELETE" }),
};
