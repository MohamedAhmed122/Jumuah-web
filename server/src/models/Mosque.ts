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
  isActive: boolean;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

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
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Mosque = mongoose.model<MosqueDocument>("Mosque", mosqueSchema);
