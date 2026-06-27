import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Announcement } from "../models/Announcement.js";
import { HalalPlace } from "../models/HalalPlace.js";
import { Mosque } from "../models/Mosque.js";
import { MosquePrayerTime } from "../models/MosquePrayerTime.js";
import { PushRegistration } from "../models/PushRegistration.js";
import { QuizQuestion } from "../models/QuizQuestion.js";
import { QuizSeen } from "../models/QuizSeen.js";
import { asyncHandler, HttpError } from "../utils/http.js";
import { dateOnlySchema, langSchema, normalizeLang, objectIdSchema } from "../utils/validation.js";
import { toJson, toJsonList } from "../utils/serialize.js";
import { removeExpiredAnnouncements } from "../services/announcementMaintenance.js";

export const publicRouter = Router();

type Lang = "en" | "ru";
type LocalizedStringLike = string | Partial<Record<Lang, string>>;
type LocalizedOptionsLike = string[] | Partial<Record<Lang, string[]>>;

function localizedText(value: LocalizedStringLike | undefined, lang: Lang) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.en || "";
}

function localizedOptions(value: LocalizedOptionsLike | undefined, lang: Lang) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value[lang] || value.en || [];
}

function serializeAnnouncement(doc: unknown, lang: Lang) {
  const item = toJson(doc) as Record<string, unknown>;
  return {
    ...item,
    title: localizedText(item.title as LocalizedStringLike, lang),
    descriptionHtml: localizedText(item.descriptionHtml as LocalizedStringLike, lang),
    lang
  };
}

function serializeQuizQuestion(doc: Record<string, unknown>, lang: Lang) {
  return {
    id: String(doc._id),
    question: localizedText(doc.question as LocalizedStringLike, lang),
    options: localizedOptions(doc.options as LocalizedOptionsLike, lang),
    correctIndex: doc.correctIndex,
    explanation: localizedText(doc.explanation as LocalizedStringLike, lang),
    category: doc.category
  };
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

publicRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "jumuah-api" });
});

publicRouter.get("/locations/mosques", asyncHandler(async (_req, res) => {
  const mosques = await Mosque.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  res.json(toJsonList(mosques));
}));

publicRouter.get("/locations/mosques/:id/prayer-times", asyncHandler(async (req, res) => {
  const params = z.object({ id: objectIdSchema }).parse(req.params);
  const query = z.object({ from: dateOnlySchema, to: dateOnlySchema }).parse(req.query);
  const items = await MosquePrayerTime.find({
    mosqueId: params.id,
    date: { $gte: query.from, $lte: query.to }
  }).sort({ date: 1 });
  res.json(toJsonList(items));
}));

publicRouter.get("/locations/halal", asyncHandler(async (_req, res) => {
  const places = await HalalPlace.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  res.json(toJsonList(places));
}));

publicRouter.get("/community/announcements", asyncHandler(async (req, res) => {
  const query = z.object({ mosqueId: objectIdSchema, lang: langSchema.optional() }).parse(req.query);
  const lang = normalizeLang(query.lang);
  const now = new Date();
  await removeExpiredAnnouncements();
  const announcements = await Announcement.find({
    status: "published",
    mosqueIds: query.mosqueId,
    $or: [
      { hideAfterEndDate: { $ne: true } },
      { endDate: { $gt: now } },
      { endDate: { $exists: false } }
    ]
  }).sort({ isPinned: -1, createdAt: -1 });
  res.json(announcements.map((announcement) => serializeAnnouncement(announcement, lang)));
}));

publicRouter.get("/community/announcements/:id", asyncHandler(async (req, res) => {
  const { id } = z.object({ id: objectIdSchema }).parse(req.params);
  const query = z.object({ mosqueId: objectIdSchema, lang: langSchema.optional() }).parse(req.query);
  const lang = normalizeLang(query.lang);
  await removeExpiredAnnouncements();
  const announcement = await Announcement.findOne({
    _id: id,
    status: "published",
    mosqueIds: query.mosqueId,
    $or: [
      { hideAfterEndDate: { $ne: true } },
      { endDate: { $gt: new Date() } },
      { endDate: { $exists: false } }
    ]
  });
  if (!announcement) throw new HttpError(404, "Announcement not found");
  res.json(serializeAnnouncement(announcement, lang));
}));

publicRouter.get("/quiz/daily", asyncHandler(async (req, res) => {
  const query = z.object({
    lang: langSchema.default("en"),
    deviceId: z.string().min(1).optional()
  }).parse(req.query);

  const chooseQuestions = async (days: number) => {
    const excludedIds = query.deviceId
      ? await QuizSeen.find({ deviceId: query.deviceId, seenAt: { $gte: new Date(Date.now() - days * 86400000) } }).distinct("questionId")
      : [];
    return QuizQuestion.find({ isActive: true, _id: { $nin: excludedIds } }).limit(200).lean();
  };

  let questions = await chooseQuestions(30);
  if (questions.length < 20) questions = await chooseQuestions(7);
  if (questions.length < 20) {
    questions = await QuizQuestion.find({ isActive: true }).limit(200).lean();
  }
  questions = shuffle(questions).slice(0, 20);

  if (query.deviceId && questions.length > 0) {
    await QuizSeen.insertMany(
      questions.map((question) => ({ deviceId: query.deviceId, questionId: question._id, seenAt: new Date() })),
      { ordered: false }
    ).catch(() => undefined);
  }

  res.json(questions.map((question) => serializeQuizQuestion(question, query.lang)));
}));

publicRouter.post("/push/register", asyncHandler(async (req, res) => {
  const body = z.object({
    token: z.string().min(1),
    deviceId: z.string().min(1),
    lang: langSchema,
    mosqueId: objectIdSchema.optional(),
    mosqueIds: z.array(objectIdSchema).optional()
  }).parse(req.body);

  const mosqueIds = body.mosqueIds?.length ? body.mosqueIds : body.mosqueId ? [body.mosqueId] : [];

  await PushRegistration.findOneAndUpdate(
    { deviceId: body.deviceId },
    { token: body.token, deviceId: body.deviceId, lang: body.lang, mosqueIds, isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ ok: true });
}));

publicRouter.use((req, _res, next) => {
  if (req.params.id && !mongoose.isValidObjectId(req.params.id)) next(new HttpError(400, "Invalid id"));
  else next();
});
