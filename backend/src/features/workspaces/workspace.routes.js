import express from "express";
import {
    listWorkspaces,
    createWorkspace,
    getWorkspace,
    updateWorkspace,
    deleteWorkspace,
} from "./workspace.controller.js";

export const workspaceRouter = express.Router();

workspaceRouter.get("/", listWorkspaces);
workspaceRouter.post("/", createWorkspace);
workspaceRouter.get("/:workspaceId", getWorkspace);
workspaceRouter.patch("/:workspaceId", updateWorkspace);
workspaceRouter.delete("/:workspaceId", deleteWorkspace);
