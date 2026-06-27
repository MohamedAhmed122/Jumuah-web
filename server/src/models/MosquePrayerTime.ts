import mongoose, { Schema } from "mongoose";

export interface MosquePrayerTimeDocument {
  mosqueId: mongoose.Types.ObjectId;
  date: string;
  times: {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const mosquePrayerTimeSchema = new Schema<MosquePrayerTimeDocument>(
  {
    mosqueId: { type: Schema.Types.ObjectId, ref: "Mosque", required: true, index: true },
    date: { type: String, required: true, index: true },
    times: {
      fajr: { type: String, required: true },
      dhuhr: { type: String, required: true },
      asr: { type: String, required: true },
      maghrib: { type: String, required: true },
      isha: { type: String, required: true }
    }
  },
  { timestamps: true }
);

mosquePrayerTimeSchema.index({ mosqueId: 1, date: 1 }, { unique: true });

export const MosquePrayerTime = mongoose.model<MosquePrayerTimeDocument>("MosquePrayerTime", mosquePrayerTimeSchema);
