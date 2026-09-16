import { Router } from "express";
import {
    createRequest,
    deleteRequest,
    duplicateRequest,
    getRequest,
    listRequests,
    moveRequest,
    sendRequest,
    updateRequest,
} from "./request.controller.js";

export const requestRouter = Router();

requestRouter.post("/send", sendRequest);
requestRouter.get("/", listRequests);
requestRouter.post("/", createRequest);
requestRouter.get("/:requestId", getRequest);
requestRouter.patch("/:requestId", updateRequest);
requestRouter.delete("/:requestId", deleteRequest);
requestRouter.post("/:requestId/duplicate", duplicateRequest);
requestRouter.patch("/:requestId/move", moveRequest);
