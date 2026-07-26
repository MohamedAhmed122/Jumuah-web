import mongoose, { Schema } from "mongoose";

export type LocalizedString = {
  en: string;
  ru: string;
  lt: string;
};

export interface AnnouncementDocument {
  title: LocalizedString;
  image: string;
  descriptionHtml: LocalizedString;
  mosqueIds: mongoose.Types.ObjectId[];
  date: Date;
  eventDate?: Date;
  endDate?: Date;
  locationType: "mosque" | "outside";
  locationMosqueId?: mongoose.Types.ObjectId;
  outsideLocation?: {
    address: string;
    lat: number;
    lng: number;
  };
  status: "draft" | "published";
  sendPushOnPublish: boolean;
  hideAfterEndDate: boolean;
  deleteAfterEndDate: boolean;
  isPinned: boolean;
  pushSentAt?: Date;
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

const announcementSchema = new Schema<AnnouncementDocument>(
  {
    title: { type: localizedStringSchema, required: true },
    image: { type: String, required: true },
    descriptionHtml: { type: localizedStringSchema, required: true },
    mosqueIds: [{ type: Schema.Types.ObjectId, ref: "Mosque", required: true }],
    date: { type: Date, required: true, default: Date.now },
    eventDate: Date,
    endDate: Date,
    locationType: { type: String, enum: ["mosque", "outside"], required: true },
    locationMosqueId: { type: Schema.Types.ObjectId, ref: "Mosque" },
    outsideLocation: { type: outsideLocationSchema, default: undefined },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    sendPushOnPublish: { type: Boolean, default: false },
    hideAfterEndDate: { type: Boolean, default: false },
    deleteAfterEndDate: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false, index: true },
    pushSentAt: Date
  },
  { timestamps: true }
);

announcementSchema.index({ mosqueIds: 1, status: 1, isPinned: -1, createdAt: -1 });
announcementSchema.index({ deleteAfterEndDate: 1, endDate: 1 });
announcementSchema.index({ "title.en": 1 });
announcementSchema.index({ "title.ru": 1 });
announcementSchema.index({ "title.lt": 1 });

export const Announcement = mongoose.model<AnnouncementDocument>("Announcement", announcementSchema);
