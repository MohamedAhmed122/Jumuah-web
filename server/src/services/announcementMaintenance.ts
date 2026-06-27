import { Announcement } from "../models/Announcement.js";

export async function removeExpiredAnnouncements() {
  return Announcement.deleteMany({
    deleteAfterEndDate: true,
    endDate: { $lte: new Date() }
  });
}

async function migrateLegacyAnnouncements() {
  const legacy = await Announcement.collection.find({
    $or: [{ excerpt: { $exists: true } }, { locationId: { $exists: true } }]
  }).toArray();

  if (legacy.length) {
    await Announcement.collection.bulkWrite(legacy.map((announcement) => {
      const locationId = announcement.locationId;
      const set: Record<string, unknown> = {};
      if (locationId) {
        if (!Array.isArray(announcement.mosqueIds) || announcement.mosqueIds.length === 0) set.mosqueIds = [locationId];
        if (!announcement.locationType) set.locationType = "mosque";
        if (!announcement.locationMosqueId) set.locationMosqueId = locationId;
      }
      return {
        updateOne: {
          filter: { _id: announcement._id },
          update: { ...(Object.keys(set).length ? { $set: set } : {}), $unset: { excerpt: "", locationId: "" } }
        }
      };
    }));
  }
}

export async function startAnnouncementMaintenance() {
  await migrateLegacyAnnouncements();
  await removeExpiredAnnouncements();
  const timer = setInterval(() => {
    void removeExpiredAnnouncements().catch((error) => console.error("Announcement cleanup failed", error));
  }, 60 * 60 * 1000);
  timer.unref();
}
