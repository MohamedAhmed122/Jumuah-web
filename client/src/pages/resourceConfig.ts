export type FieldType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "searchableSelect"
  | "tags"
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
  showWhen?: { field: string; equals: unknown };
  min?: number;
  max?: number;
  step?: number;
};

export type ResourceConfig = {
  title: string;
  endpoint: string;
  columns: string[];
  fields: FieldConfig[];
  defaults: Record<string, unknown>;
  filters?: FieldConfig[];
};

const restaurantFoodCategories = [
  "Burger", "Shawarma", "Biryani", "Pizza", "Pasta", "Egyptian food", "Plov", "Shashlik",
  "Kebab", "Grill", "Middle Eastern", "Turkish", "Indian", "Pakistani", "Central Asian",
  "Lebanese", "Syrian", "Afghan", "Uzbek", "Mediterranean", "Seafood", "Steakhouse",
  "Breakfast", "Bakery", "Desserts", "Vegetarian"
];

const lithuanianCities = [
  "Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys", "Alytus", "Marijampolė",
  "Mažeikiai", "Jonava", "Utena", "Kėdainiai", "Tauragė", "Telšiai", "Ukmergė",
  "Visaginas", "Palanga", "Plungė", "Kretinga", "Šilutė", "Radviliškis", "Druskininkai",
  "Gargždai", "Rokiškis", "Biržai", "Kuršėnai", "Elektrėnai", "Jurbarkas", "Garliava",
  "Vilkaviškis", "Raseiniai", "Anykščiai", "Lentvaris", "Grigiškės", "Prienai", "Joniškis",
  "Kelmė", "Varėna", "Kaišiadorys", "Pasvalys", "Kupiškis", "Zarasai", "Skuodas",
  "Kazlų Rūda", "Širvintos", "Molėtai", "Šalčininkai", "Trakai", "Naujoji Akmenė",
  "Švenčionys", "Ignalina", "Pakruojis", "Lazdijai", "Rietavas", "Birštonas", "Nida"
];

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
    columns: ["image", "name", "category", "foodCategories", "averageMealCost", "promoCode", "discountPercent", "country", "city", "isActive"],
    defaults: { category: "restaurant", foodCategories: [], country: "Lithuania", isActive: true, lat: 54.6872, lng: 25.2797, descriptionHtml: "<p></p>" },
    fields: [
      { name: "image", label: "Image", type: "image", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "category", label: "Place type", type: "select", options: ["restaurant", "grocery", "fast_food", "supermarket_halal"], required: true },
      {
        name: "foodCategories",
        label: "Restaurant food categories",
        type: "tags",
        options: restaurantFoodCategories,
        showWhen: { field: "category", equals: "restaurant" }
      },
      { name: "averageMealCost", label: "Average meal cost for one person (€)", type: "number", min: 0, step: 0.01, showWhen: { field: "category", equals: "restaurant" } },
      { name: "country", label: "Country", type: "text", required: true },
      { name: "city", label: "City", type: "searchableSelect", options: lithuanianCities, required: true },
      { name: "address", label: "Address", type: "placeAutocomplete", required: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "hours", label: "Hours HH:mm-HH:mm", type: "text" },
      { name: "descriptionHtml", label: "Description", type: "richtext", required: true },
      { name: "promoCode", label: "Promo code", type: "text" },
      { name: "discountPercent", label: "Discount (%)", type: "number", min: 0, max: 100, step: 1 },
      { name: "sortOrder", label: "Sort order", type: "number" },
      { name: "isActive", label: "Active", type: "boolean" }
    ],
    filters: [
      { name: "category", label: "Place type", type: "select", options: ["restaurant", "grocery", "fast_food", "supermarket_halal"] },
      { name: "foodCategory", label: "Food category", type: "select", options: restaurantFoodCategories },
      { name: "city", label: "City", type: "select", options: lithuanianCities }
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
