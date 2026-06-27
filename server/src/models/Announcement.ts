import mongoose, { Schema } from "mongoose";

export type LocalizedString = {
  en: string;
  ru: string;
};

export interface AnnouncementDocument {
  title: LocalizedString;
  excerpt: LocalizedString;
  image: string;
  descriptionHtml: LocalizedString;
  date: Date;
  eventDate?: Date;
  locationId?: mongoose.Types.ObjectId;
  status: "draft" | "published";
  sendPushOnPublish: boolean;
  pushSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const localizedStringSchema = new Schema<LocalizedString>(
  {
    en: { type: String, default: "" },
    ru: { type: String, default: "" }
  },
  { _id: false }
);

const announcementSchema = new Schema<AnnouncementDocument>(
  {
    title: { type: localizedStringSchema, required: true },
    excerpt: { type: localizedStringSchema, required: true },
    image: { type: String, required: true },
    descriptionHtml: { type: localizedStringSchema, required: true },
    date: { type: Date, required: true, default: Date.now },
    eventDate: Date,
    locationId: { type: Schema.Types.ObjectId, ref: "Mosque" },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    sendPushOnPublish: { type: Boolean, default: false },
    pushSentAt: Date
  },
  { timestamps: true }
);

announcementSchema.index({ status: 1, date: -1 });
announcementSchema.index({ "title.en": 1 });
announcementSchema.index({ "title.ru": 1 });

export const Announcement = mongoose.model<AnnouncementDocument>("Announcement", announcementSchema);
