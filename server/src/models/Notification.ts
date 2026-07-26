import mongoose, { Schema } from "mongoose";
import type { LocalizedString } from "./Announcement.js";

export type NotificationScreen = "main" | "community" | "settings" | "notifications";
export type NotificationWeekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface NotificationDocument {
  title: LocalizedString;
  description: LocalizedString;
  mosqueIds: mongoose.Types.ObjectId[];
  screen?: NotificationScreen;
  startsAt?: Date;
  endsAt?: Date;
  isDismissLocked: boolean;
  repeatEnabled: boolean;
  repeatDays: NotificationWeekday[];
  repeatTime?: string;
  timezone: string;
  isActive: boolean;
  firstSentAt?: Date;
  lastSentAt?: Date;
  sendCount: number;
  lastScheduledKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const localizedStringSchema = new Schema<LocalizedString>(
  {
    en: { type: String, required: true, trim: true },
    ru: { type: String, required: true, trim: true },
    lt: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const notificationSchema = new Schema<NotificationDocument>(
  {
    title: { type: localizedStringSchema, required: true },
    description: { type: localizedStringSchema, required: true },
    mosqueIds: [{ type: Schema.Types.ObjectId, ref: "Mosque", required: true }],
    screen: { type: String, enum: ["main", "community", "settings", "notifications"] },
    startsAt: Date,
    endsAt: Date,
    isDismissLocked: { type: Boolean, default: false },
    repeatEnabled: { type: Boolean, default: false },
    repeatDays: [{ type: String, enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] }],
    repeatTime: String,
    timezone: { type: String, default: "Europe/Vilnius" },
    isActive: { type: Boolean, default: true, index: true },
    firstSentAt: Date,
    lastSentAt: Date,
    sendCount: { type: Number, default: 0 },
    lastScheduledKey: String
  },
  { timestamps: true }
);

notificationSchema.index({ mosqueIds: 1, createdAt: -1 });
notificationSchema.index({ repeatEnabled: 1, isActive: 1, startsAt: 1, endsAt: 1 });

export const Notification = mongoose.model<NotificationDocument>("Notification", notificationSchema);
