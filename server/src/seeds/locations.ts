import { connectDb } from "../config/db.js";
import { HalalPlace } from "../models/HalalPlace.js";
import { Mosque } from "../models/Mosque.js";

await connectDb();

await Mosque.updateOne(
  { name: "Vilnius Mosque" },
  {
    $setOnInsert: {
      name: "Vilnius Mosque",
      address: "Example street 1, Vilnius",
      phone: "+37060000000",
      hours: "09:00-21:00",
      lat: 54.6872,
      lng: 25.2797,
      jumuahTimes: { first: "13:30", second: "14:30" },
      isActive: true,
      sortOrder: 1
    }
  },
  { upsert: true }
);

await HalalPlace.updateOne(
  { name: "Halal Restaurant" },
  {
    $setOnInsert: {
      name: "Halal Restaurant",
      category: "restaurant",
      address: "Example street 2, Vilnius",
      phone: "+37060000001",
      hours: "10:00-22:00",
      image: "https://example.com/uploads/halal-restaurant.jpg",
      descriptionHtml: "<p>Family-friendly halal restaurant in Vilnius.</p>",
      lat: 54.688,
      lng: 25.28,
      city: "Vilnius",
      isActive: true,
      sortOrder: 1
    }
  },
  { upsert: true }
);

console.log("Starter locations ready");
process.exit(0);
