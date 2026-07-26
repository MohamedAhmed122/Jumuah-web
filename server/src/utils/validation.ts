import { z } from "zod";

export const langSchema = z.enum(["en", "ru", "lt"]);
export const hhmmSchema = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|--:--)$/, "Expected HH:mm or --:--");
export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
export const hoursSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/).optional().or(z.literal(""));
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const prayerTimesSchema = z.object({
  fajr: hhmmSchema,
  dhuhr: hhmmSchema,
  asr: hhmmSchema,
  maghrib: hhmmSchema,
  isha: hhmmSchema
});

export function normalizeLang(value: unknown) {
  const parsed = langSchema.safeParse(value);
  return parsed.success ? parsed.data : "en";
}
