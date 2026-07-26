import mongoose, { Schema } from "mongoose";

export interface MosqueDocument {
  name: string;
  address: string;
  phone?: string;
  hours?: string;
  image?: string;
  descriptionHtml?: string;
  lat: number;
  lng: number;
  jumuahTimes?: {
    first?: string;
    second?: string;
  };
  iqamaOffsets?: {
    fajr?: number;
    dhuhr?: number;
    asr?: number;
    maghrib?: number;
    isha?: number;
  };
  iqamaTimes?: {
    fajr?: string;
    dhuhr?: string;
    asr?: string;
    maghrib?: string;
    isha?: string;
  };
  jummahSchedule?: {
    allFridays: boolean;
    startDate?: string;
    endDate?: string;
    times: string[];
  };
  isActive: boolean;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

const iqamaOffsetsSchema = new Schema(
  {
    fajr: { type: Number, min: 0, max: 180 },
    dhuhr: { type: Number, min: 0, max: 180 },
    asr: { type: Number, min: 0, max: 180 },
    maghrib: { type: Number, min: 0, max: 180 },
    isha: { type: Number, min: 0, max: 180 }
  },
  { _id: false }
);

const iqamaTimesSchema = new Schema(
  {
    fajr: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    dhuhr: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    asr: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    maghrib: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    isha: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ }
  },
  { _id: false }
);

const jummahScheduleSchema = new Schema(
  {
    allFridays: { type: Boolean, required: true },
    startDate: String,
    endDate: String,
    times: {
      type: [String],
      required: true,
      validate: {
        validator: (times: string[]) => times.length >= 1 && times.length <= 3,
        message: "Jummah schedule requires one to three times"
      }
    }
  },
  { _id: false }
);

const mosqueSchema = new Schema<MosqueDocument>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: String,
    hours: String,
    image: String,
    descriptionHtml: String,
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    jumuahTimes: {
      first: String,
      second: String
    },
    iqamaOffsets: { type: iqamaOffsetsSchema, default: undefined },
    iqamaTimes: { type: iqamaTimesSchema, default: undefined },
    jummahSchedule: { type: jummahScheduleSchema, default: undefined },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Mosque = mongoose.model<MosqueDocument>("Mosque", mosqueSchema);
