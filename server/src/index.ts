import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { startAnnouncementMaintenance } from "./services/announcementMaintenance.js";

await connectDb();
await startAnnouncementMaintenance();

createApp().listen(env.port, () => {
  console.log(`jumuah-api listening on http://localhost:${env.port}`);
});
