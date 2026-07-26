import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { env } from "../config/env.js";
import { Announcement } from "../models/Announcement.js";
import { HalalPlace } from "../models/HalalPlace.js";
import { Mosque } from "../models/Mosque.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const photoDir = path.join(projectRoot, "photo");
const uploadDir = path.join(projectRoot, "server", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

function seedImage(filename: string) {
  const source = path.join(photoDir, filename);
  if (!fs.existsSync(source)) throw new Error(`Seed image not found: ${source}`);
  const targetName = `demo-${filename}`;
  fs.copyFileSync(source, path.join(uploadDir, targetName));
  return `${env.publicUrl.replace(/\/$/, "")}/uploads/${targetName}`;
}

function futureDate(days: number, hour = 18) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

await connectDb();

const mosqueSeeds = [
  {
    name: "Demo • Vilnius Islamic Centre",
    address: "Konstitucijos pr. 00, Vilnius",
    phone: "+370 600 11001",
    hours: "08:00-22:00",
    image: seedImage("mosque3.jpg"),
    descriptionHtml: "<p>A welcoming demo community centre offering daily prayers, Quran learning, family programmes and youth activities in Vilnius.</p>",
    lat: 54.6948,
    lng: 25.2768,
    iqamaOffsets: { fajr: 20, dhuhr: 15, asr: 15, maghrib: 10, isha: 15 },
    jummahSchedule: { allFridays: true, times: ["13:15", "14:15", "15:00"] },
    isActive: true,
    sortOrder: 10
  },
  {
    name: "Demo • Kaunas Muslim Community Centre",
    address: "Laisvės al. 00, Kaunas",
    phone: "+370 600 11002",
    hours: "08:30-21:30",
    image: seedImage("mosque4.jpg"),
    descriptionHtml: "<p>A family-focused demo mosque in Kaunas with prayer facilities, weekend classes and regular community gatherings.</p>",
    lat: 54.8985,
    lng: 23.9036,
    iqamaOffsets: { fajr: 20, dhuhr: 15, asr: 15, maghrib: 8, isha: 15 },
    jummahSchedule: { allFridays: true, times: ["13:30", "14:30"] },
    isActive: true,
    sortOrder: 20
  },
  {
    name: "Demo • Klaipėda Prayer House",
    address: "Taikos pr. 00, Klaipėda",
    phone: "+370 600 11003",
    hours: "09:00-21:00",
    image: seedImage("mosque2.jpg"),
    descriptionHtml: "<p>A peaceful demo prayer space serving Muslims in Klaipėda with daily salah, Friday prayer and newcomer support.</p>",
    lat: 55.7033,
    lng: 21.1443,
    iqamaOffsets: { fajr: 15, dhuhr: 15, asr: 15, maghrib: 10, isha: 15 },
    jummahSchedule: { allFridays: true, times: ["13:30", "14:30"] },
    isActive: true,
    sortOrder: 30
  },
  {
    name: "Demo • Šiauliai Islamic Community Hall",
    address: "Vilniaus g. 00, Šiauliai",
    phone: "+370 600 11004",
    hours: "09:00-21:00",
    image: seedImage("mosque5.jpg"),
    descriptionHtml: "<p>A friendly demo community hall providing congregational prayer, Islamic education and shared meals in Šiauliai.</p>",
    lat: 55.9349,
    lng: 23.3137,
    iqamaOffsets: { fajr: 20, dhuhr: 15, asr: 15, maghrib: 10, isha: 15 },
    jummahSchedule: { allFridays: true, times: ["13:30"] },
    isActive: true,
    sortOrder: 40
  },
  {
    name: "Demo • Panevėžys Muslim Centre",
    address: "Respublikos g. 00, Panevėžys",
    phone: "+370 600 11005",
    hours: "09:00-21:30",
    image: seedImage("mosque12.jpg"),
    descriptionHtml: "<p>A warm demo centre for worship, study circles and community support in Panevėžys.</p>",
    lat: 55.7348,
    lng: 24.3575,
    iqamaOffsets: { fajr: 20, dhuhr: 15, asr: 15, maghrib: 10, isha: 15 },
    jummahSchedule: { allFridays: true, times: ["13:45", "14:45"] },
    isActive: true,
    sortOrder: 50
  }
] as const;

for (const mosque of mosqueSeeds) {
  await Mosque.updateOne({ name: mosque.name }, { $set: mosque }, { upsert: true });
}

const mosques = await Mosque.find({ name: { $in: mosqueSeeds.map((mosque) => mosque.name) } });
const mosqueByName = new Map(mosques.map((mosque) => [mosque.name, mosque]));
const mosqueId = (name: string) => {
  const mosque = mosqueByName.get(name);
  if (!mosque) throw new Error(`Seed mosque was not created: ${name}`);
  return mosque._id;
};

const vilnius = mosqueSeeds[0].name;
const kaunas = mosqueSeeds[1].name;
const klaipeda = mosqueSeeds[2].name;
const siauliai = mosqueSeeds[3].name;
const panevezys = mosqueSeeds[4].name;

const announcementSeeds = [
  {
    title: { en: "Friday family gathering", ru: "Пятничная семейная встреча" },
    image: seedImage("Mosque20.jpg"),
    descriptionHtml: {
      en: "<p>Join our community after the second Jummah prayer for a shared meal, a short reminder and activities for children. Families and newcomers are warmly welcome.</p>",
      ru: "<p>Присоединяйтесь к общине после второго пятничного намаза: общий обед, короткое напоминание и занятия для детей. Семьи и новые участники всегда желанны.</p>"
    },
    mosqueIds: [mosqueId(vilnius), mosqueId(kaunas)],
    date: new Date(), eventDate: futureDate(5, 15), endDate: futureDate(5, 18),
    locationType: "mosque", locationMosqueId: mosqueId(vilnius), status: "published",
    sendPushOnPublish: false, hideAfterEndDate: true, deleteAfterEndDate: false, isPinned: true
  },
  {
    title: { en: "Quran circle for beginners", ru: "Кружок Корана для начинающих" },
    image: seedImage("Quran1.jpg"),
    descriptionHtml: {
      en: "<p>A gentle weekly circle for adults beginning their Quran journey. We will practise Arabic letters, pronunciation and short surahs in a supportive group.</p>",
      ru: "<p>Еженедельный кружок для взрослых, начинающих изучать Коран. Будем практиковать арабские буквы, произношение и короткие суры в дружеской атмосфере.</p>"
    },
    mosqueIds: [mosqueId(vilnius)],
    date: new Date(), eventDate: futureDate(9, 18), endDate: futureDate(9, 20),
    locationType: "mosque", locationMosqueId: mosqueId(vilnius), status: "published",
    sendPushOnPublish: false, hideAfterEndDate: true, deleteAfterEndDate: false, isPinned: true
  },
  {
    title: { en: "Youth Quran recitation evening", ru: "Вечер чтения Корана для молодёжи" },
    image: seedImage("Quran10.jpg"),
    descriptionHtml: {
      en: "<p>An evening for young Muslims to recite together, improve confidence and meet other students. Tea and light refreshments will be provided.</p>",
      ru: "<p>Вечер для мусульманской молодёжи: совместное чтение, развитие уверенности и знакомство с другими учащимися. Будут чай и лёгкие угощения.</p>"
    },
    mosqueIds: [mosqueId(kaunas), mosqueId(klaipeda)],
    date: new Date(), eventDate: futureDate(12, 18), endDate: futureDate(12, 20),
    locationType: "mosque", locationMosqueId: mosqueId(kaunas), status: "published",
    sendPushOnPublish: false, hideAfterEndDate: true, deleteAfterEndDate: false, isPinned: false
  },
  {
    title: { en: "Practical Tajwid workshop", ru: "Практический семинар по таджвиду" },
    image: seedImage("Quran13.jpg"),
    descriptionHtml: {
      en: "<p>A practical workshop covering the most common Tajwid rules with guided exercises and individual feedback. Please bring a Quran and notebook.</p>",
      ru: "<p>Практический семинар по основным правилам таджвида с упражнениями и индивидуальной обратной связью. Возьмите с собой Коран и тетрадь.</p>"
    },
    mosqueIds: [mosqueId(klaipeda)],
    date: new Date(), eventDate: futureDate(16, 11), endDate: futureDate(16, 14),
    locationType: "mosque", locationMosqueId: mosqueId(klaipeda), status: "published",
    sendPushOnPublish: false, hideAfterEndDate: true, deleteAfterEndDate: false, isPinned: false
  },
  {
    title: { en: "Community open day", ru: "День открытых дверей общины" },
    image: seedImage("mosque1.jpg"),
    descriptionHtml: {
      en: "<p>Invite friends and neighbours to visit the centre, learn about Muslim life in Lithuania and enjoy a guided tour with refreshments.</p>",
      ru: "<p>Пригласите друзей и соседей посетить центр, узнать о жизни мусульман в Литве и принять участие в экскурсии с угощением.</p>"
    },
    mosqueIds: mosqueSeeds.map((mosque) => mosqueId(mosque.name)),
    date: new Date(), eventDate: futureDate(20, 12), endDate: futureDate(20, 17),
    locationType: "outside",
    outsideLocation: { address: "Demo Community Square, Vilnius", lat: 54.6872, lng: 25.2797 },
    status: "published", sendPushOnPublish: false, hideAfterEndDate: true,
    deleteAfterEndDate: false, isPinned: false
  },
  {
    title: { en: "Sisters Quran reflection circle", ru: "Женский кружок размышления над Кораном" },
    image: seedImage("Quran2.jpg"),
    descriptionHtml: {
      en: "<p>A monthly sisters-only gathering to read selected verses, reflect together and strengthen community bonds in a private and welcoming space.</p>",
      ru: "<p>Ежемесячная женская встреча для чтения избранных аятов, совместных размышлений и укрепления связей в уютной обстановке.</p>"
    },
    mosqueIds: [mosqueId(siauliai), mosqueId(panevezys)],
    date: new Date(), eventDate: futureDate(24, 17), endDate: futureDate(24, 19),
    locationType: "mosque", locationMosqueId: mosqueId(siauliai), status: "published",
    sendPushOnPublish: false, hideAfterEndDate: true, deleteAfterEndDate: false, isPinned: false
  },
  {
    title: { en: "Children's Quran morning", ru: "Детское утро Корана" },
    image: seedImage("Quran3.jpg"),
    descriptionHtml: {
      en: "<p>A cheerful Saturday programme with short-surah practice, Islamic stories, creative activities and a light lunch for children aged 6 to 12.</p>",
      ru: "<p>Субботняя программа для детей 6–12 лет: короткие суры, исламские истории, творческие занятия и лёгкий обед.</p>"
    },
    mosqueIds: [mosqueId(panevezys)],
    date: new Date(), eventDate: futureDate(28, 10), endDate: futureDate(28, 13),
    locationType: "mosque", locationMosqueId: mosqueId(panevezys), status: "published",
    sendPushOnPublish: false, hideAfterEndDate: true, deleteAfterEndDate: false, isPinned: false
  }
] as const;

for (const announcement of announcementSeeds) {
  await Announcement.updateOne({ "title.en": announcement.title.en }, { $set: announcement }, { upsert: true });
}

const halalSeeds = [
  ["Demo • Amber Grill", "restaurant", "rest1.jpg", "Vilnius", 54.6872, 25.2797, ["Grill", "Kebab", "Middle Eastern"], 18, "AMBER10", 10],
  ["Demo • Bosphorus Table", "restaurant", "rest2.jpg", "Kaunas", 54.8985, 23.9036, ["Turkish", "Shawarma", "Grill"], 16, "TABLE15", 15],
  ["Demo • Silk Road Plov", "restaurant", "rest3.jpg", "Klaipėda", 55.7033, 21.1443, ["Plov", "Uzbek", "Central Asian"], 15, "PLOV10", 10],
  ["Demo • Cairo Kitchen", "restaurant", "rest4.jpg", "Šiauliai", 55.9349, 23.3137, ["Egyptian food", "Grill"], 17, "", 0],
  ["Demo • Lahore Biryani", "restaurant", "rest5.jpg", "Panevėžys", 55.7348, 24.3575, ["Biryani", "Pakistani", "Indian"], 14, "BIRYANI12", 12],
  ["Demo • Cedar House", "restaurant", "rest6.jpg", "Alytus", 54.3964, 24.0414, ["Lebanese", "Shawarma", "Middle Eastern"], 16, "CEDAR10", 10],
  ["Demo • Caspian Shashlik", "restaurant", "rest7.jpg", "Marijampolė", 54.5599, 23.3541, ["Shashlik", "Central Asian", "Grill"], 19, "", 0],
  ["Demo • Medina Family Restaurant", "restaurant", "rest8.jpg", "Utena", 55.4976, 25.5992, ["Middle Eastern", "Burger"], 15, "FAMILY10", 10],
  ["Demo • Anatolia Breakfast", "restaurant", "rest1.jpg", "Jonava", 55.0727, 24.2798, ["Breakfast", "Turkish"], 13, "MORNING10", 10],
  ["Demo • Damascus Garden", "restaurant", "rest2.jpg", "Kėdainiai", 55.2879, 23.9728, ["Syrian", "Grill", "Shawarma"], 17, "GARDEN15", 15],
  ["Demo • Crescent Pizza", "restaurant", "rest3.jpg", "Tauragė", 55.2522, 22.2897, ["Pizza", "Pasta"], 14, "PIZZA10", 10],
  ["Demo • Noor Steakhouse", "restaurant", "rest4.jpg", "Telšiai", 55.9863, 22.2507, ["Steakhouse", "Grill"], 24, "NOOR10", 10],
  ["Demo • Quick Halal Burger", "fast_food", "fast2.jpg", "Vilnius", 54.6972, 25.2697, [], null, "QUICK10", 10],
  ["Demo • Shawarma Stop", "fast_food", "fast1.jpg", "Kaunas", 54.9085, 23.9136, [], null, "WRAP15", 15],
  ["Demo • Halal Bites", "fast_food", "fast2.jpg", "Klaipėda", 55.7133, 21.1543, [], null, "BITES10", 10],
  ["Demo • Green Crescent Market", "grocery", "market1.jpg", "Vilnius", 54.6772, 25.2897, [], null, "MARKET5", 5],
  ["Demo • Baltic Halal Grocery", "grocery", "market2.jpg", "Kaunas", 54.8885, 23.8936, [], null, "BALTIC10", 10],
  ["Demo • Ummah Food Market", "grocery", "market3.jpg", "Šiauliai", 55.9249, 23.3037, [], null, "", 0],
  ["Demo • Family Halal Pantry", "grocery", "market4.jpg", "Panevėžys", 55.7248, 24.3475, [], null, "PANTRY5", 5],
  ["Demo • Noor Halal Supermarket", "supermarket_halal", "market5.jpg", "Alytus", 54.4064, 24.0514, [], null, "NOOR8", 8]
] as const;

for (const [name, category, imageFile, city, lat, lng, foodCategories, averageMealCost, promoCode, discountPercent] of halalSeeds) {
  await HalalPlace.updateOne(
    { name },
    {
      $set: {
        name,
        category,
        image: seedImage(imageFile),
        address: `Demo address, ${city}`,
        phone: `+370 600 ${String(12000 + halalSeeds.findIndex((item) => item[0] === name)).padStart(5, "0")}`,
        hours: category === "fast_food" ? "11:00-23:00" : "09:00-21:00",
        descriptionHtml: `<p>A welcoming demo ${category.replaceAll("_", " ")} in ${city} offering halal products and friendly service.</p>`,
        lat,
        lng,
        country: "Lithuania",
        city,
        foodCategories,
        averageMealCost: averageMealCost ?? undefined,
        promoCode: promoCode || undefined,
        discountPercent: discountPercent || undefined,
        isActive: true,
        sortOrder: 100 + halalSeeds.findIndex((item) => item[0] === name)
      }
    },
    { upsert: true }
  );
}

console.log(`Demo content ready: ${mosqueSeeds.length} mosques, ${announcementSeeds.length} announcements, ${halalSeeds.length} halal places.`);
await mongoose.disconnect();
