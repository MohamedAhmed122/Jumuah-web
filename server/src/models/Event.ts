import mongoose, { Schema } from "mongoose";
import type { LocalizedString } from "./Announcement.js";

export interface EventDocument {
  title: LocalizedString;
  image: string;
  descriptionHtml: LocalizedString;
  mosqueIds: mongoose.Types.ObjectId[];
  eventDate: Date;
  endDate?: Date;
  locationType: "mosque" | "outside";
  locationMosqueId?: mongoose.Types.ObjectId;
  outsideLocation?: {
    address: string;
    lat: number;
    lng: number;
  };
  status: "draft" | "published" | "cancelled";
  registrationEnabled: boolean;
  capacity?: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const localizedStringSchema = new Schema<LocalizedString>(
  {
    en: { type: String, default: "" },
    ru: { type: String, default: "" },
    lt: { type: String, default: "" }
  },
  { _id: false }
);

const outsideLocationSchema = new Schema(
  {
    address: { type: String, required: true, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  { _id: false }
);

const eventSchema = new Schema<EventDocument>(
  {
    title: { type: localizedStringSchema, required: true },
    image: { type: String, required: true },
    descriptionHtml: { type: localizedStringSchema, required: true },
    mosqueIds: [{ type: Schema.Types.ObjectId, ref: "Mosque", required: true }],
    eventDate: { type: Date, required: true },
    endDate: Date,
    locationType: { type: String, enum: ["mosque", "outside"], required: true },
    locationMosqueId: { type: Schema.Types.ObjectId, ref: "Mosque" },
    outsideLocation: { type: outsideLocationSchema, default: undefined },
    status: { type: String, enum: ["draft", "published", "cancelled"], default: "draft", index: true },
    registrationEnabled: { type: Boolean, default: true },
    capacity: { type: Number, min: 1 },
    isPinned: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

eventSchema.index({ mosqueIds: 1, status: 1, isPinned: -1, eventDate: 1 });
eventSchema.index({ "title.en": 1 });
eventSchema.index({ "title.ru": 1 });
eventSchema.index({ "title.lt": 1 });

export const Event = mongoose.model<EventDocument>("Event", eventSchema);
