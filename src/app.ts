import express from "express";
import cors from "cors";
import { documentRoutes } from "./routes/documentation.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "AI Documentation Generator API is running",
  });
});

app.use("/api/documentation", documentRoutes);

export default app;