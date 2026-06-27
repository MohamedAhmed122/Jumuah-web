import mongoose, { Schema } from "mongoose";

export interface AdminUserDocument {
  email: string;
  passwordHash: string;
  role: "admin";
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adminUserSchema = new Schema<AdminUserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin"], default: "admin", required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "AdminUser" },
    lastLoginAt: Date
  },
  { timestamps: true }
);

export const AdminUser = mongoose.model<AdminUserDocument>("AdminUser", adminUserSchema);
