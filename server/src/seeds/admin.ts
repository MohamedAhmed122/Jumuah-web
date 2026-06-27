import bcrypt from "bcryptjs";
import { connectDb } from "../config/db.js";
import { env } from "../config/env.js";
import { AdminUser } from "../models/AdminUser.js";

await connectDb();

const passwordHash = await bcrypt.hash(env.adminPassword, 12);
const user = await AdminUser.findOneAndUpdate(
  { email: env.adminEmail.toLowerCase() },
  { email: env.adminEmail.toLowerCase(), passwordHash, role: "admin", isActive: true },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

console.log(`Bootstrap admin ready: ${user.email}`);
process.exit(0);
