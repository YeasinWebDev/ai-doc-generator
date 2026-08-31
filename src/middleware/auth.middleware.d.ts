import type { NextFunction, Request, Response } from "express";
export declare function attachSession(req: Request, _res: Response, next: NextFunction): Promise<void>;
export declare function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map