import { workspaceService } from "./workspace.service.js";

export async function listWorkspaces(request, response, next) {
    try {
        const workspaces = await workspaceService.list(request.account);
        response.json({ data: workspaces });
    } catch (error) {
        next(error);
    }
}

export async function createWorkspace(request, response, next) {
    try {
        const { name, description } = request.body || {};
        const workspace = await workspaceService.create(request.account, { name, description });
        response.status(201).json({ data: workspace });
    } catch (error) {
        next(error);
    }
}

export async function getWorkspace(request, response, next) {
    try {
        const workspace = await workspaceService.getById(request.account, request.params.workspaceId);
        response.json({ data: workspace });
    } catch (error) {
        next(error);
    }
}

export async function updateWorkspace(request, response, next) {
    try {
        const { name, description } = request.body || {};
        const workspace = await workspaceService.update(
            request.account,
            request.params.workspaceId,
            { name, description }
        );
        response.json({ data: workspace });
    } catch (error) {
        next(error);
    }
}

export async function deleteWorkspace(request, response, next) {
    try {
        const result = await workspaceService.delete(request.account, request.params.workspaceId);
        response.json({ data: result });
    } catch (error) {
        next(error);
    }
}
