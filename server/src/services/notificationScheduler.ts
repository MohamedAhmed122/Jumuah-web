import { Notification, type NotificationWeekday } from "../models/Notification.js";
import { sendNotificationPush } from "./push.js";

export function localScheduleParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = value("weekday").toLowerCase() as NotificationWeekday;
  const time = `${value("hour")}:${value("minute")}`;
  const key = `${value("year")}-${value("month")}-${value("day")}T${time}`;
  return { weekday, time, key };
}

export async function deliverRepeatingNotifications(now = new Date()) {
  const notifications = await Notification.find({
    isActive: true,
    repeatEnabled: true,
    startsAt: { $lte: now },
    endsAt: { $gte: now }
  });

  for (const notification of notifications) {
    const schedule = localScheduleParts(now, notification.timezone);
    if (notification.repeatTime !== schedule.time || !notification.repeatDays.includes(schedule.weekday)) continue;
    const claimed = await Notification.findOneAndUpdate(
      { _id: notification._id, lastScheduledKey: { $ne: schedule.key } },
      { $set: { lastScheduledKey: schedule.key } },
      { new: true }
    );
    if (!claimed) continue;
    await sendNotificationPush(claimed);
    const sentAt = new Date();
    await Notification.updateOne(
      { _id: claimed._id },
      { $set: { firstSentAt: claimed.firstSentAt ?? sentAt, lastSentAt: sentAt }, $inc: { sendCount: 1 } }
    );
  }
}

export function startNotificationScheduler() {
  void deliverRepeatingNotifications().catch((error) => console.error("Notification scheduler failed", error));
  const timer = setInterval(() => {
    void deliverRepeatingNotifications().catch((error) => console.error("Notification scheduler failed", error));
  }, 30 * 1000);
  timer.unref();
}
