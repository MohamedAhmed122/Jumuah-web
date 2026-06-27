import { Expo } from "expo-server-sdk";
import type { AnnouncementDocument } from "../models/Announcement.js";
import { PushRegistration } from "../models/PushRegistration.js";

const expo = new Expo();
type Lang = "en" | "ru";

function localizedText(value: string | Partial<Record<Lang, string>>, lang: Lang) {
  if (typeof value === "string") return value;
  return value[lang] || value.en || "";
}

export async function sendAnnouncementPush(announcement: AnnouncementDocument & { _id: unknown }) {
  const registrations = await PushRegistration.find({ isActive: true });
  const messages = registrations
    .filter((registration) => Expo.isExpoPushToken(registration.token))
    .map((registration) => ({
      to: registration.token,
      sound: "default" as const,
      title: localizedText(announcement.title, registration.lang),
      body: localizedText(announcement.excerpt, registration.lang),
      data: { type: "announcement", id: String(announcement._id) }
    }))
    .filter((message) => message.title && message.body);

  for (const chunk of expo.chunkPushNotifications(messages)) {
    await expo.sendPushNotificationsAsync(chunk);
  }
}
