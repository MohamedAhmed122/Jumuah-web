export type FieldType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "reference"
  | "placeAutocomplete"
  | "textarea"
  | "richtext"
  | "localizedText"
  | "localizedTextarea"
  | "localizedRichtext"
  | "localizedOptions"
  | "image"
  | "datetime"
  | "password";

export type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  source?: "mosques";
  required?: boolean;
};

export type ResourceConfig = {
  title: string;
  endpoint: string;
  columns: string[];
  fields: FieldConfig[];
  defaults: Record<string, unknown>;
  filters?: FieldConfig[];
};

export const resources: Record<string, ResourceConfig> = {
  users: {
    title: "Admin Users",
    endpoint: "/api/admin/users",
    columns: ["email", "role", "isActive", "lastLoginAt", "createdAt"],
    defaults: { role: "admin", isActive: true },
    fields: [
      { name: "email", label: "Email", type: "text", required: true },
      { name: "password", label: "Password", type: "password" },
      { name: "role", label: "Role", type: "select", options: ["admin"], required: true },
      { name: "isActive", label: "Active", type: "boolean" }
    ]
  },
  mosques: {
    title: "Mosques",
    endpoint: "/api/admin/mosques",
    columns: ["image", "name", "address", "phone", "hours", "isActive"],
    defaults: { isActive: true, lat: 54.6872, lng: 25.2797 },
    fields: [
      { name: "image", label: "Image", type: "image" },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "address", label: "Address", type: "placeAutocomplete", required: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "hours", label: "Hours HH:mm-HH:mm", type: "text" },
      { name: "sortOrder", label: "Sort order", type: "number" },
      { name: "isActive", label: "Active", type: "boolean" }
    ]
  },
  "halal-places": {
    title: "Halal Places",
    endpoint: "/api/admin/halal-places",
    columns: ["image", "name", "category", "city", "address", "phone", "hours", "isActive"],
    defaults: { category: "restaurant", isActive: true, lat: 54.6872, lng: 25.2797, descriptionHtml: "<p></p>" },
    fields: [
      { name: "image", label: "Image", type: "image", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "category", label: "Category", type: "select", options: ["restaurant", "grocery", "fast_food", "supermarket_halal"], required: true },
      { name: "city", label: "City", type: "text" },
      { name: "address", label: "Address", type: "placeAutocomplete", required: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "hours", label: "Hours HH:mm-HH:mm", type: "text" },
      { name: "descriptionHtml", label: "Description", type: "richtext", required: true },
      { name: "sortOrder", label: "Sort order", type: "number" },
      { name: "isActive", label: "Active", type: "boolean" }
    ],
    filters: [{ name: "category", label: "Category", type: "select", options: ["restaurant", "grocery", "fast_food", "supermarket_halal"] }]
  },
  announcements: {
    title: "Announcements",
    endpoint: "/api/admin/announcements",
    columns: ["image", "title", "status", "locationId", "date", "eventDate"],
    defaults: {
      title: { en: "", ru: "" },
      excerpt: { en: "", ru: "" },
      descriptionHtml: { en: "<p></p>", ru: "<p></p>" },
      status: "draft",
      sendPushOnPublish: false,
      date: new Date().toISOString()
    },
    fields: [
      { name: "image", label: "Image", type: "image", required: true },
      { name: "status", label: "Status", type: "select", options: ["draft", "published"], required: true },
      { name: "title", label: "Title", type: "localizedText", required: true },
      { name: "excerpt", label: "Excerpt", type: "localizedTextarea", required: true },
      { name: "descriptionHtml", label: "Description", type: "localizedRichtext", required: true },
      { name: "date", label: "Date", type: "datetime", required: true },
      { name: "eventDate", label: "Event date", type: "datetime" },
      { name: "locationId", label: "Location", type: "reference", source: "mosques" },
      { name: "sendPushOnPublish", label: "Send push on publish", type: "boolean" }
    ],
    filters: [
      { name: "status", label: "Status", type: "select", options: ["draft", "published"] }
    ]
  },
  "quiz-questions": {
    title: "Quiz Questions",
    endpoint: "/api/admin/quiz-questions",
    columns: ["question", "category", "isActive"],
    defaults: {
      question: { en: "", ru: "" },
      options: { en: ["", "", "", ""], ru: ["", "", "", ""] },
      explanation: { en: "", ru: "" },
      category: "fiqh",
      isActive: true,
      correctIndex: 0
    },
    fields: [
      { name: "category", label: "Category", type: "select", options: ["aqeedah", "fiqh", "seerah", "quran", "hadith"], required: true },
      { name: "question", label: "Question", type: "localizedTextarea", required: true },
      { name: "options", label: "Answer options", type: "localizedOptions", required: true },
      { name: "correctIndex", label: "Correct answer index", type: "select", options: ["0", "1", "2", "3"], required: true },
      { name: "explanation", label: "Explanation", type: "localizedTextarea", required: true },
      { name: "isActive", label: "Active", type: "boolean" }
    ],
    filters: [
      { name: "category", label: "Category", type: "select", options: ["aqeedah", "fiqh", "seerah", "quran", "hadith"] }
    ]
  }
};
