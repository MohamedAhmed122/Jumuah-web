import mongoose, { Schema } from "mongoose";

export interface HalalPlaceDocument {
  name: string;
  category: "restaurant" | "grocery" | "fast_food" | "supermarket_halal";
  address: string;
  phone?: string;
  hours?: string;
  image: string;
  descriptionHtml: string;
  lat: number;
  lng: number;
  city?: string;
  isActive: boolean;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

const halalPlaceSchema = new Schema<HalalPlaceDocument>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ["restaurant", "grocery", "fast_food", "supermarket_halal"], required: true, index: true },
    address: { type: String, required: true, trim: true },
    phone: String,
    hours: String,
    image: { type: String, required: true },
    descriptionHtml: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    city: String,
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const HalalPlace = mongoose.model<HalalPlaceDocument>("HalalPlace", halalPlaceSchema);
