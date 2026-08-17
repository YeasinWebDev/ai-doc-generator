import { Router } from "express";
import { documentationController } from "../controllers/documentation.controller.js";

export const documentRoutes = Router();

documentRoutes.post("/", documentationController);
