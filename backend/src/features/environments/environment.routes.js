import { Router } from "express";
import { environmentController } from "./environment.controller.js";

export const environmentRouter = Router();

environmentRouter.get("/", environmentController.list);
environmentRouter.get("/:id", environmentController.getById);
environmentRouter.post("/", environmentController.create);
environmentRouter.put("/:id", environmentController.update);
environmentRouter.delete("/:id", environmentController.remove);
environmentRouter.post("/:id/duplicate", environmentController.duplicate);
