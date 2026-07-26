import dotenv from "dotenv";
import path from "node:path";

dotenv.config();
if (!process.env.MONGO_URI) dotenv.config({ path: path.resolve("..", ".env") });

export const env = {
  mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/jumuah",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
  port: Number(process.env.PORT ?? 4000),
  publicUrl: process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@example.com",
  adminPassword: process.env.ADMIN_PASSWORD ?? "change-me-now"
};
