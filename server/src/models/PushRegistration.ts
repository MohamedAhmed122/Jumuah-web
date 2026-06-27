import mongoose, { Schema } from "mongoose";

export interface PushRegistrationDocument {
  deviceId: string;
  token: string;
  lang: "en" | "ru";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pushRegistrationSchema = new Schema<PushRegistrationDocument>(
  {
    deviceId: { type: String, required: true, unique: true, trim: true },
    token: { type: String, required: true },
    lang: { type: String, enum: ["en", "ru"], required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

pushRegistrationSchema.index({ lang: 1, isActive: 1 });

export const PushRegistration = mongoose.model<PushRegistrationDocument>("PushRegistration", pushRegistrationSchema);
