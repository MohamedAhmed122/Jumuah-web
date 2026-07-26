import mongoose, { Schema } from "mongoose";

export interface EventAttendanceDocument {
  eventId: mongoose.Types.ObjectId;
  deviceId: string;
  lang: "en" | "ru" | "lt";
  isActive: boolean;
  joinedAt: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const eventAttendanceSchema = new Schema<EventAttendanceDocument>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    deviceId: { type: String, required: true, trim: true },
    lang: { type: String, enum: ["en", "ru", "lt"], required: true },
    isActive: { type: Boolean, default: true, index: true },
    joinedAt: { type: Date, default: Date.now },
    cancelledAt: Date
  },
  { timestamps: true }
);

eventAttendanceSchema.index({ eventId: 1, deviceId: 1 }, { unique: true });
eventAttendanceSchema.index({ eventId: 1, isActive: 1 });

export const EventAttendance = mongoose.model<EventAttendanceDocument>("EventAttendance", eventAttendanceSchema);
