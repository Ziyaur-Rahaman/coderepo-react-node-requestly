import { request } from "../../shared/api/client.js";

export const historyApi = {
    list: ({ search = "", method = "", limit = 50, skip = 0 } = {}) => {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (method && method !== "ALL") params.append("method", method);
        if (limit) params.append("limit", String(limit));
        if (skip) params.append("skip", String(skip));

        const query = params.toString() ? `?${params.toString()}` : "";
        return request(`/history${query}`);
    },

    get: (id) => request(`/history/${id}`),

    remove: (id) =>
        request(`/history/${id}`, {
            method: "DELETE",
        }),

    clearAll: () =>
        request("/history", {
            method: "DELETE",
        }),
};
