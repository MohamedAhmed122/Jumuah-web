import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AdminUser } from "../models/AdminUser.js";
import { Announcement } from "../models/Announcement.js";
import { HalalPlace } from "../models/HalalPlace.js";
import { Mosque } from "../models/Mosque.js";
import { MosquePrayerTime } from "../models/MosquePrayerTime.js";
import { PushRegistration } from "../models/PushRegistration.js";
import { QuizQuestion } from "../models/QuizQuestion.js";
import { requireAdmin, signAdminToken, type AdminRequest } from "../middleware/auth.js";
import { upload, uploadUrl } from "../services/uploads.js";
import { sendAnnouncementPush } from "../services/push.js";
import { asyncHandler, HttpError } from "../utils/http.js";
import { dateOnlySchema, langSchema, objectIdSchema, prayerTimesSchema } from "../utils/validation.js";
import { toJson, toJsonList } from "../utils/serialize.js";

export const adminRouter = Router();

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  lang: langSchema.optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  mosqueId: objectIdSchema.optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional()
});

const mosqueSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().optional().or(z.literal("")),
  hours: z.string().optional().or(z.literal("")),
  image: z.string().optional().or(z.literal("")),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  jumuahTimes: z.object({ first: z.string().optional().or(z.literal("")), second: z.string().optional().or(z.literal("")) }).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().optional()
});

const prayerTimeSchema = z.object({
  mosqueId: objectIdSchema,
  date: dateOnlySchema,
  times: prayerTimesSchema
});

const iqamaOffsetsSchema = z.object({
  fajr: z.coerce.number().int().min(0).max(180),
  dhuhr: z.coerce.number().int().min(0).max(180),
  asr: z.coerce.number().int().min(0).max(180),
  maghrib: z.coerce.number().int().min(0).max(180),
  isha: z.coerce.number().int().min(0).max(180)
});

const halalPlaceSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["restaurant", "grocery", "fast_food", "supermarket_halal"]),
  address: z.string().min(1),
  phone: z.string().optional().or(z.literal("")),
  hours: z.string().optional().or(z.literal("")),
  image: z.string().min(1),
  descriptionHtml: z.string().min(1),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  city: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().optional()
});

const localizedStringSchema = z.object({
  en: z.string().min(1),
  ru: z.string().min(1)
});

const localizedOptionsSchema = z.object({
  en: z.array(z.string().min(1)).length(4),
  ru: z.array(z.string().min(1)).length(4)
});

const announcementSchema = z.object({
  title: localizedStringSchema,
  excerpt: localizedStringSchema,
  image: z.string().min(1),
  descriptionHtml: localizedStringSchema,
  date: z.coerce.date(),
  eventDate: z.coerce.date().optional().nullable(),
  locationId: objectIdSchema.optional().or(z.literal("")),
  status: z.enum(["draft", "published"]).default("draft"),
  sendPushOnPublish: z.boolean().default(false)
});

const quizSchema = z.object({
  question: localizedStringSchema,
  options: localizedOptionsSchema,
  correctIndex: z.coerce.number().int().min(0).max(3),
  explanation: localizedStringSchema,
  category: z.enum(["aqeedah", "fiqh", "seerah", "quran", "hadith"]),
  isActive: z.boolean().default(true)
});

async function paged(model: any, filter: Record<string, unknown>, req: AdminRequest, sort: Record<string, 1 | -1> = { createdAt: -1 }, omit: string[] = []) {
  const query = pageQuery.parse(req.query);
  const skip = (query.page - 1) * query.pageSize;
  const [items, total] = await Promise.all([
    model.find(filter).sort(sort).skip(skip).limit(query.pageSize),
    model.countDocuments(filter)
  ]);
  return { items: toJsonList(items, omit), total, page: query.page, pageSize: query.pageSize };
}

function textSearch(search?: string, fields: string[] = ["name"]) {
  return search ? { $or: fields.map((field) => ({ [field]: new RegExp(search, "i") })) } : {};
}

async function ensureAnotherActiveAdmin(targetId: string, actorId?: string) {
  if (targetId !== actorId) return;
  const count = await AdminUser.countDocuments({ isActive: true, role: "admin", _id: { $ne: targetId } });
  if (count === 0) throw new HttpError(400, "Another active admin must exist before changing your own account");
}

adminRouter.post("/auth/login", asyncHandler(async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const user = await AdminUser.findOne({ email: body.email.toLowerCase(), isActive: true });
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) throw new HttpError(401, "Invalid email or password");
  user.lastLoginAt = new Date();
  await user.save();
  res.json({ token: signAdminToken({ id: String(user._id), role: user.role }), user: toJson(user, ["passwordHash", "createdBy", "isActive", "lastLoginAt", "createdAt", "updatedAt"]) });
}));

adminRouter.use(requireAdmin);

adminRouter.get("/dashboard", asyncHandler(async (_req, res) => {
  const [mosques, halalPlaces, announcements, quizQuestions, pushDevices, adminUsers] = await Promise.all([
    Mosque.countDocuments({ isActive: true }),
    HalalPlace.countDocuments({ isActive: true }),
    Announcement.countDocuments({ status: "published" }),
    QuizQuestion.countDocuments({ isActive: true }),
    PushRegistration.countDocuments({ isActive: true }),
    AdminUser.countDocuments({ isActive: true })
  ]);
  res.json({ mosques, halalPlaces, announcements, quizQuestions, pushDevices, adminUsers });
}));

adminRouter.post("/uploads", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "File is required" });
  res.json({ url: uploadUrl(req.file.filename) });
});

adminRouter.get("/users", asyncHandler(async (req, res) => {
  const query = pageQuery.parse(req.query);
  res.json(await paged(AdminUser, textSearch(query.search, ["email"]), req as AdminRequest, { createdAt: -1 }, ["passwordHash"]));
}));

adminRouter.post("/users", asyncHandler(async (req: AdminRequest, res) => {
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.literal("admin").default("admin"),
    isActive: z.boolean().default(true)
  }).parse(req.body);
  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await AdminUser.create({ email: body.email.toLowerCase(), passwordHash, role: "admin", isActive: body.isActive, createdBy: req.admin?.id });
  res.status(201).json(toJson(user, ["passwordHash"]));
}));

adminRouter.get("/users/:id", asyncHandler(async (req, res) => {
  const { id } = z.object({ id: objectIdSchema }).parse(req.params);
  const user = await AdminUser.findById(id);
  if (!user) throw new HttpError(404, "Admin user not found");
  res.json(toJson(user, ["passwordHash"]));
}));

adminRouter.put("/users/:id", asyncHandler(async (req: AdminRequest, res) => {
  const { id } = z.object({ id: objectIdSchema }).parse(req.params);
  const body = z.object({
    email: z.string().email().optional(),
    password: z.string().min(8).optional().or(z.literal("")),
    role: z.literal("admin").optional(),
    isActive: z.boolean().optional()
  }).parse(req.body);
  if (body.isActive === false) await ensureAnotherActiveAdmin(id, req.admin?.id);
  const update: Record<string, unknown> = { ...body, email: body.email?.toLowerCase() };
  delete update.password;
  if (body.password) update.passwordHash = await bcrypt.hash(body.password, 12);
  const user = await AdminUser.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!user) throw new HttpError(404, "Admin user not found");
  res.json(toJson(user, ["passwordHash"]));
}));

adminRouter.delete("/users/:id", asyncHandler(async (req: AdminRequest, res) => {
  const { id } = z.object({ id: objectIdSchema }).parse(req.params);
  await ensureAnotherActiveAdmin(id, req.admin?.id);
  const user = await AdminUser.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!user) throw new HttpError(404, "Admin user not found");
  res.json(toJson(user, ["passwordHash"]));
}));

function crudRoutes(path: string, model: any, schema: z.ZodTypeAny, searchFields: string[], sort: Record<string, 1 | -1> = { createdAt: -1 }) {
  adminRouter.get(path, asyncHandler(async (req, res) => {
    const query = pageQuery.parse(req.query);
    const filter: Record<string, unknown> = { ...textSearch(query.search, searchFields) };
    if (query.category) filter.category = query.category;
    if (query.status) filter.status = query.status;
    if (query.mosqueId) filter.mosqueId = query.mosqueId;
    if (query.from || query.to) filter.date = { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {}) };
    res.json(await paged(model, filter, req as AdminRequest, sort));
  }));

  adminRouter.post(path, asyncHandler(async (req, res) => {
    const item = await model.create(schema.parse(req.body));
    if (model === Announcement && item.status === "published" && item.sendPushOnPublish) {
      await sendAnnouncementPush(item);
      item.pushSentAt = new Date();
      await item.save();
    }
    res.status(201).json(toJson(item));
  }));

  adminRouter.get(`${path}/:id`, asyncHandler(async (req, res) => {
    const { id } = z.object({ id: objectIdSchema }).parse(req.params);
    const item = await model.findById(id);
    if (!item) throw new HttpError(404, "Item not found");
    res.json(toJson(item));
  }));

  adminRouter.put(`${path}/:id`, asyncHandler(async (req, res) => {
    const { id } = z.object({ id: objectIdSchema }).parse(req.params);
    const previous = model === Announcement ? await model.findById(id) : null;
    const item = await model.findByIdAndUpdate(id, schema.parse(req.body), { new: true, runValidators: true });
    if (!item) throw new HttpError(404, "Item not found");
    if (model === Announcement && previous?.status !== "published" && item.status === "published" && item.sendPushOnPublish && !item.pushSentAt) {
      await sendAnnouncementPush(item);
      item.pushSentAt = new Date();
      await item.save();
    }
    res.json(toJson(item));
  }));

  adminRouter.delete(`${path}/:id`, asyncHandler(async (req, res) => {
    const { id } = z.object({ id: objectIdSchema }).parse(req.params);
    const inactiveField = [Mosque, HalalPlace, QuizQuestion].includes(model) ? "isActive" : null;
    const item = inactiveField ? await model.findByIdAndUpdate(id, { [inactiveField]: false }, { new: true }) : await model.findByIdAndDelete(id);
    if (!item) throw new HttpError(404, "Item not found");
    res.json(toJson(item));
  }));
}

crudRoutes("/mosques", Mosque, mosqueSchema, ["name", "address"], { sortOrder: 1, name: 1 });
crudRoutes("/mosque-prayer-times", MosquePrayerTime, prayerTimeSchema, ["date"], { date: 1 });
crudRoutes("/halal-places", HalalPlace, halalPlaceSchema, ["name", "address", "city"], { sortOrder: 1, name: 1 });
crudRoutes(
  "/announcements",
  Announcement,
  announcementSchema.transform((body) => ({ ...body, eventDate: body.eventDate || undefined, locationId: body.locationId || undefined })),
  ["title.en", "title.ru", "excerpt.en", "excerpt.ru"],
  { date: -1 }
);
crudRoutes("/quiz-questions", QuizQuestion, quizSchema, ["question.en", "question.ru", "explanation.en", "explanation.ru"], { createdAt: -1 });

adminRouter.get("/mosques/:id/iqama-offsets", asyncHandler(async (req, res) => {
  const { id } = z.object({ id: objectIdSchema }).parse(req.params);
  const mosque = await Mosque.findById(id).select("iqamaOffsets");
  if (!mosque) throw new HttpError(404, "Mosque not found");
  res.json({ mosqueId: id, iqamaOffsets: mosque.iqamaOffsets ?? null });
}));

adminRouter.put("/mosques/:id/iqama-offsets", asyncHandler(async (req, res) => {
  const { id } = z.object({ id: objectIdSchema }).parse(req.params);
  const iqamaOffsets = iqamaOffsetsSchema.parse(req.body);
  const mosque = await Mosque.findByIdAndUpdate(
    id,
    { $set: { iqamaOffsets } },
    { new: true, runValidators: true }
  ).select("iqamaOffsets");
  if (!mosque) throw new HttpError(404, "Mosque not found");
  res.json({ mosqueId: id, iqamaOffsets: mosque.iqamaOffsets });
}));

adminRouter.post("/mosques/:id/prayer-times/import", asyncHandler(async (req, res) => {
  const { id } = z.object({ id: objectIdSchema }).parse(req.params);
  const body = z.object({
    items: z.array(z.object({ date: dateOnlySchema, times: prayerTimesSchema }))
  }).parse(req.body);

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  for (const item of body.items) {
    const result = await MosquePrayerTime.updateOne(
      { mosqueId: id, date: item.date },
      { $set: { times: item.times } },
      { upsert: true }
    );
    if (result.upsertedCount) created += 1;
    else if (result.modifiedCount) updated += 1;
    else if (result.matchedCount) unchanged += 1;
  }
  res.json({ created, updated, unchanged, total: body.items.length });
}));

adminRouter.post("/quiz-questions/import", asyncHandler(async (req, res) => {
  const body = z.object({ items: z.array(quizSchema) }).parse(req.body);
  const items = await QuizQuestion.insertMany(body.items);
  res.status(201).json({ created: items.length });
}));

adminRouter.get("/push-registrations", asyncHandler(async (req, res) => {
  const query = pageQuery.parse(req.query);
  const filter: Record<string, unknown> = { ...textSearch(query.search, ["deviceId", "token"]) };
  if (query.lang) filter.lang = query.lang;
  res.json(await paged(PushRegistration, filter, req as AdminRequest, { updatedAt: -1 }));
}));
