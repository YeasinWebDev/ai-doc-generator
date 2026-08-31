import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { authRoutes } from "./routes/auth.routes.js";
import { documentRoutes } from "./routes/documentation.routes.js";
const app = express();
app.use(cors({
    origin: env.frontendUrl,
    credentials: true,
}));
app.use(express.json());
app.get("/health", (_req, res) => {
    res.json({
        success: true,
        message: "AI Documentation Generator API is running",
    });
});
app.use("/api/auth", authRoutes);
app.use("/api/documentation", documentRoutes);
export default app;
//# sourceMappingURL=app.js.map