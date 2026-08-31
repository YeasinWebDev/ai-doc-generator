import { Router } from "express";
import { documentationController, getUserRepositoriesController, getDocumentationByIdController, getUserGeneratedDocumentsController } from "../controllers/documentation.controller.js";
import { attachSession, requireAuth } from "../middleware/auth.middleware.js";
export const documentRoutes = Router();
documentRoutes.post("/", requireAuth, attachSession, documentationController);
documentRoutes.get("/", requireAuth, getUserRepositoriesController);
documentRoutes.get("/user/documents", requireAuth, attachSession, getUserGeneratedDocumentsController);
documentRoutes.get("/:id", requireAuth, attachSession, getDocumentationByIdController);
//# sourceMappingURL=documentation.routes.js.map