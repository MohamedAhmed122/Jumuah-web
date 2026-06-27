import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AdminUser } from "../models/AdminUser.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    role: "admin";
    email: string;
  };
}

export function signAdminToken(user: { id: string; role: "admin" }) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: "7d" });
}

export async function requireAdmin(req: AdminRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) throw new HttpError(401, "Missing token");

    const payload = jwt.verify(token, env.jwtSecret) as { sub?: string; role?: string };
    if (!payload.sub || payload.role !== "admin") throw new HttpError(401, "Invalid token");

    const user = await AdminUser.findById(payload.sub);
    if (!user || !user.isActive || user.role !== "admin") throw new HttpError(403, "Admin access required");

    req.admin = { id: String(user._id), role: user.role, email: user.email };
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Invalid token"));
  }
}
