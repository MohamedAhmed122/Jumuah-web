import mongoose, { Schema } from "mongoose";
import type { LocalizedString } from "./Announcement.js";

export type LocalizedOptions = {
  en: string[];
  ru: string[];
};

export interface QuizQuestionDocument {
  question: LocalizedString;
  options: LocalizedOptions;
  correctIndex: number;
  explanation: LocalizedString;
  category: "aqeedah" | "fiqh" | "seerah" | "quran" | "hadith";
  isActive: boolean;
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

const quizQuestionSchema = new Schema<QuizQuestionDocument>(
  {
    question: { type: localizedStringSchema, required: true },
    options: {
      en: {
        type: [String],
        default: ["", "", "", ""],
        validate: [(options: string[]) => options.length === 4, "Exactly 4 English options are required"]
      },
      ru: {
        type: [String],
        default: ["", "", "", ""],
        validate: [(options: string[]) => options.length === 4, "Exactly 4 Russian options are required"]
      }
    },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: localizedStringSchema, required: true },
    category: { type: String, enum: ["aqeedah", "fiqh", "seerah", "quran", "hadith"], required: true, index: true },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

quizQuestionSchema.index({ "question.en": 1 });
quizQuestionSchema.index({ "question.ru": 1 });

export const QuizQuestion = mongoose.model<QuizQuestionDocument>("QuizQuestion", quizQuestionSchema);
