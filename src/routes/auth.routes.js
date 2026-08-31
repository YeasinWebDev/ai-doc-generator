import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
export const authRoutes = Router();
authRoutes.get("/github", authController.loginWithGitHub);
authRoutes.get("/github/callback", authController.handleGitHubCallback);
authRoutes.get("/me", authController.getCurrentUser);
authRoutes.post("/logout", authController.logout);
//# sourceMappingURL=auth.routes.js.map