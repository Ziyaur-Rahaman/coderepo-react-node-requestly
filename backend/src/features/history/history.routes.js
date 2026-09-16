import { Router } from "express";
import {
    clearHistory,
    deleteHistory,
    getHistory,
    listHistory,
} from "./history.controller.js";

export const historyRouter = Router();

historyRouter.get("/", listHistory);
historyRouter.delete("/", clearHistory);
historyRouter.get("/:historyId", getHistory);
historyRouter.delete("/:historyId", deleteHistory);
