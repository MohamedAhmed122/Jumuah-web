import mongoose, { Schema } from "mongoose";
import type { LocalizedString } from "./Announcement.js";

export interface HalalPlaceDocument {
  name: string;
  category: "restaurant" | "grocery" | "fast_food" | "supermarket_halal";
  foodCategories?: string[];
  averageMealCost?: number;
  promoCode?: string;
  discountPercent?: number;
  address: string;
  phone?: string;
  hours?: string;
  image: string;
  descriptionHtml: string | LocalizedString;
  lat: number;
  lng: number;
  country: string;
  city: string;
  isActive: boolean;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

const halalPlaceSchema = new Schema<HalalPlaceDocument>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ["restaurant", "grocery", "fast_food", "supermarket_halal"], required: true, index: true },
    foodCategories: [{ type: String, trim: true }],
    averageMealCost: { type: Number, min: 0 },
    promoCode: { type: String, trim: true },
    discountPercent: { type: Number, min: 0, max: 100 },
    address: { type: String, required: true, trim: true },
    phone: String,
    hours: String,
    image: { type: String, required: true },
    descriptionHtml: { type: Schema.Types.Mixed, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    country: { type: String, required: true, trim: true, default: "Lithuania", index: true },
    city: { type: String, required: true, trim: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

halalPlaceSchema.index({ foodCategories: 1 });

export const HalalPlace = mongoose.model<HalalPlaceDocument>("HalalPlace", halalPlaceSchema);
