import type { Request, Response } from "express";
export declare const authController: {
    loginWithGitHub(_req: Request, res: Response): Promise<void>;
    handleGitHubCallback(req: Request, res: Response): Promise<void>;
    getCurrentUser(req: Request, res: Response): Promise<void>;
    logout(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=auth.controller.d.ts.map