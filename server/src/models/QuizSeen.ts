import mongoose, { Schema } from "mongoose";

export interface QuizSeenDocument {
  deviceId: string;
  questionId: mongoose.Types.ObjectId;
  seenAt: Date;
}

const quizSeenSchema = new Schema<QuizSeenDocument>({
  deviceId: { type: String, required: true, index: true },
  questionId: { type: Schema.Types.ObjectId, ref: "QuizQuestion", required: true },
  seenAt: { type: Date, default: Date.now, index: true }
});

quizSeenSchema.index({ deviceId: 1, questionId: 1 });
quizSeenSchema.index({ deviceId: 1, seenAt: -1 });

export const QuizSeen = mongoose.model<QuizSeenDocument>("QuizSeen", quizSeenSchema);
