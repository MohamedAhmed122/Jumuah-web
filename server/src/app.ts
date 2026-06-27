import path from "node:path";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { adminRouter } from "./routes/admin.js";
import { publicRouter } from "./routes/public.js";
import { errorHandler } from "./utils/http.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: [env.clientOrigin, "http://localhost:3000", "http://localhost:5173"], credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use("/uploads", express.static(path.resolve("uploads")));
  app.use(rateLimit({ windowMs: 60_000, limit: 300 }));

  app.use("/api/admin", adminRouter);
  app.use("/api", publicRouter);

  app.use((_req, res) => res.status(404).json({ message: "Not found" }));
  app.use(errorHandler);

  return app;
}
