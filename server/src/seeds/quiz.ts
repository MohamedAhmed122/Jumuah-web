import { connectDb } from "../config/db.js";
import { QuizQuestion } from "../models/QuizQuestion.js";

await connectDb();

const questions = [
  {
    question: {
      en: "How many daily prayers are obligatory?",
      ru: "Сколько обязательных ежедневных молитв?"
    },
    options: {
      en: ["3", "4", "5", "6"],
      ru: ["3", "4", "5", "6"]
    },
    correctIndex: 2,
    explanation: {
      en: "There are five obligatory daily prayers.",
      ru: "Обязательных ежедневных молитв пять."
    },
    category: "fiqh",
    isActive: true
  }
] as const;

for (const question of questions) {
  await QuizQuestion.updateOne({ "question.en": question.question.en }, { $setOnInsert: question }, { upsert: true });
}

console.log("Starter quiz questions ready");
process.exit(0);
