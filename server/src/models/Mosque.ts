import mongoose, { Schema } from "mongoose";

export interface MosqueDocument {
  name: string;
  address: string;
  phone?: string;
  hours?: string;
  image?: string;
  lat: number;
  lng: number;
  jumuahTimes?: {
    first?: string;
    second?: string;
  };
  iqamaOffsets?: {
    fajr: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
  };
  isActive: boolean;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

const iqamaOffsetsSchema = new Schema(
  {
    fajr: { type: Number, required: true, min: 0, max: 180 },
    dhuhr: { type: Number, required: true, min: 0, max: 180 },
    asr: { type: Number, required: true, min: 0, max: 180 },
    maghrib: { type: Number, required: true, min: 0, max: 180 },
    isha: { type: Number, required: true, min: 0, max: 180 }
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
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    jumuahTimes: {
      first: String,
      second: String
    },
    iqamaOffsets: { type: iqamaOffsetsSchema, default: undefined },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Mosque = mongoose.model<MosqueDocument>("Mosque", mosqueSchema);
