# Muslim Community Lithuania Backend + Admin Panel

MERN stack backend and admin panel for the Muslim Community Lithuania mobile app.

The mobile app is an Expo React Native app. It expects JSON REST endpoints and automatically sends `?lang=en` or `?lang=ru` on every API request. The backend must support the app’s current API contract exactly, while also providing a protected Material UI admin panel for managing map locations, announcements, quiz questions, and push notification registrations.

## Stack

- Backend: Node.js, Express, TypeScript preferred
- Database: MongoDB with Mongoose
- Admin: React + Material UI
- Auth: JWT-based admin login
- File uploads: local storage under `/uploads`
- API format: JSON only
- CORS enabled for local admin and mobile development

## Required Public Mobile API

Base URL will be configured in the mobile app as `EXPO_PUBLIC_API_URL`.

The mobile app currently defaults to:

```txt
https://api.jumuah.lt
```

Every public response should be plain JSON. Do not wrap arrays in `{ data: ... }` unless the endpoint below explicitly says so.

### Language

The mobile app sends `lang` as a query param on every request:

```txt
?lang=en
?lang=ru
```

Supported languages:

```ts
type Lang = "en" | "ru";
```

For announcements and quiz questions, admin records store all supported translations in one document. Public mobile endpoints use `lang` to return the matching localized fields as plain strings/arrays.

## Data Types Expected By The Mobile App

### Mosque

```ts
interface Mosque {
  id: string;
  name: string;
  address: string;
  phone?: string;
  hours?: string; // preferred format: "09:00-21:00"
  image?: string; // image URL uploaded from admin panel
  lat: number;
  lng: number;
  jumuahTimes?: {
    first?: string; // e.g. "13:30"
    second?: string; // e.g. "14:30"
  };
}
```

Notes:

- `id` must be a string. Convert Mongo `_id` to `id`.
- `lat` and `lng` must be numbers.
- `hours` is currently parsed by the app only if it matches `HH:mm-HH:mm`, for example `10:00-22:00`.
- `image` is uploaded from the admin panel and should be a public URL.
- `jumuahTimes` is optional, but the admin panel should support both first and second Jumu'ah times.
- Admin address input uses Lithuania-only place autocomplete and stores the selected place in the existing `address`, `lat`, and `lng` fields. Latitude and longitude are hidden in the form and filled from the selected place. No additional address field is required in MongoDB.

### Mosque Prayer Time

Mosque prayer times should be stored separately from the mosque record. The app should use admin-provided mosque prayer times when available for a date, and fall back to local offline calculation when no admin-provided record exists.

```ts
interface MosquePrayerTime {
  id: string;
  mosqueId: string;
  date: string; // "YYYY-MM-DD", e.g. "2026-06-19"
  times: {
    fajr: string; // "HH:mm"
    dhuhr: string; // "HH:mm"
    asr: string; // "HH:mm"
    maghrib: string; // "HH:mm"
    isha: string; // "HH:mm"
  };
}
```

Notes:

- Prefer named prayer fields over arrays. Arrays like `["12:00", "15:00"]` are fragile because order mistakes are easy.
- Admin panel should allow manual editing per mosque/date.
- Admin panel supports bulk date-range entry by generating five prayer-time inputs for each selected date.
- Mobile app fallback rule: if `MosquePrayerTime` exists for selected mosque and today, show API times; otherwise show locally calculated app times.

### Halal Place

```ts
interface HalalPlace {
  id: string;
  name: string;
  category: "restaurant" | "grocery" | "fast_food" | "supermarket_halal";
  address: string;
  phone?: string;
  hours?: string; // preferred format: "09:00-21:00"
  image: string; // image URL uploaded from admin panel
  descriptionHtml: string; // rich text HTML from admin RichText editor
  lat: number;
  lng: number;
  city?: string;
}
```

Notes:

- The mobile app uses `category` for map pin colors and filters.
- The butcher list is derived from halal places where category is `grocery` or `supermarket_halal`.
- `image` is required for the admin-managed place detail experience.
- `descriptionHtml` should be created with a RichText editor in the admin panel.
- Admin address input uses Lithuania-only place autocomplete and stores the selected place in the existing `address`, `lat`, `lng`, and optional `city` fields. If `city` is filled before searching, suggestions are biased to that city. Latitude and longitude are hidden in the form and filled from the selected place. No additional address field is required in MongoDB.

### Announcement

```ts
interface Announcement {
  id: string;
  title: string;
  excerpt: string;
  image: string; // image URL uploaded from admin panel
  descriptionHtml: string; // rich text HTML from admin RichText editor
  date: string; // ISO string recommended
  eventDate?: string; // ISO string recommended
  locationId?: string;
  lang: "en" | "ru";
}
```

Notes:

- Admin-side announcement records store localized fields as objects, for example `title: { en: string; ru: string }`, while public mobile responses return the selected language as a plain `title: string`.
- The feed screen should display `image`, `date`, `eventDate`, `title`, and `excerpt`.
- The detail screen should display `image`, `date`, `eventDate`, `title`, `excerpt`, and `descriptionHtml`.
- `descriptionHtml` should be created with a RichText editor in the admin panel.
- `locationId` is optional for future map preview/linking.

Admin-side announcement records store all supported translations in one document:

```ts
interface AnnouncementDocument {
  id: string;
  title: { en: string; ru: string };
  excerpt: { en: string; ru: string };
  image: string;
  descriptionHtml: { en: string; ru: string };
  date: string;
  eventDate?: string;
  locationId?: string;
  status: "draft" | "published";
  sendPushOnPublish: boolean;
  pushSentAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Quiz Question

```ts
interface QuizQuestion {
  id: string;
  question: string;
  options: string[]; // exactly 4 options
  correctIndex: number; // 0-3
  explanation: string;
  category: "aqeedah" | "fiqh" | "seerah" | "quran" | "hadith";
}
```

Admin-side quiz records store all supported translations in one document:

```ts
interface QuizQuestionDocument {
  id: string;
  question: { en: string; ru: string };
  options: { en: string[]; ru: string[] }; // exactly 4 options per language
  correctIndex: number;
  explanation: { en: string; ru: string };
  category: "aqeedah" | "fiqh" | "seerah" | "quran" | "hadith";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Push Registration

```ts
interface PushRegistrationPayload {
  token: string;
  deviceId: string;
  lang: "en" | "ru";
}
```

Store one active push registration per `deviceId`, updating token/lang when the same device registers again.

## Public Mobile Endpoints

### Health Check

```http
GET /api/health
```

Response:

```json
{
  "ok": true,
  "service": "jumuah-api"
}
```

### Get Mosques

```http
GET /api/locations/mosques?lang=en
```

Response:

```json
[
  {
    "id": "665f1c2a91f1d8c62bc00001",
    "name": "Vilnius Mosque",
    "address": "Example street 1, Vilnius",
    "phone": "+37060000000",
    "hours": "09:00-21:00",
    "image": "https://example.com/uploads/vilnius-mosque.jpg",
    "lat": 54.6872,
    "lng": 25.2797,
    "jumuahTimes": {
      "first": "13:30",
      "second": "14:30"
    }
  }
]
```

### Get Mosque Prayer Times

```http
GET /api/locations/mosques/:id/prayer-times?from=2026-06-19&to=2026-06-26
```

Response:

```json
[
  {
    "id": "665f1c2a91f1d8c62bc00020",
    "mosqueId": "665f1c2a91f1d8c62bc00001",
    "date": "2026-06-19",
    "times": {
      "fajr": "01:21",
      "dhuhr": "13:25",
      "asr": "17:50",
      "maghrib": "22:04",
      "isha": "23:19"
    }
  }
]
```

Rules:

- `from` and `to` use `YYYY-MM-DD`.
- Return an empty array if no admin-managed prayer times exist for the range.
- The mobile app will fall back to local calculated prayer times for dates missing from this response.

### Get Halal Places

```http
GET /api/locations/halal?lang=en
```

Response:

```json
[
  {
    "id": "665f1c2a91f1d8c62bc00002",
    "name": "Halal Restaurant",
    "category": "restaurant",
    "address": "Example street 2, Vilnius",
    "phone": "+37060000001",
    "hours": "10:00-22:00",
    "image": "https://example.com/uploads/halal-restaurant.jpg",
    "descriptionHtml": "<p>Family-friendly halal restaurant in Vilnius.</p>",
    "lat": 54.688,
    "lng": 25.28,
    "city": "Vilnius"
  }
]
```

### Get Announcements Feed

```http
GET /api/community/announcements?lang=en
```

Response:

```json
[
  {
    "id": "665f1c2a91f1d8c62bc00003",
    "title": "Friday Community Dinner",
    "excerpt": "Join us after Maghrib for dinner and community gathering.",
    "image": "https://example.com/uploads/dinner.jpg",
    "descriptionHtml": "<p>Join us after Maghrib for dinner and community gathering.</p><p>Families are welcome.</p>",
    "date": "2026-06-19T10:00:00.000Z",
    "eventDate": "2026-06-21T18:00:00.000Z",
    "locationId": "665f1c2a91f1d8c62bc00001",
    "lang": "en"
  }
]
```

Rules:

- Return only published announcements.
- Use `lang` to choose localized `title`, `excerpt`, and `descriptionHtml`.
- Sort newest first by `date`.

### Get Announcement By ID

```http
GET /api/community/announcements/:id?lang=en
```

Response:

```json
{
  "id": "665f1c2a91f1d8c62bc00003",
  "title": "Friday Community Dinner",
  "excerpt": "Join us after Maghrib for dinner and community gathering.",
  "image": "https://example.com/uploads/dinner.jpg",
  "descriptionHtml": "<p>Join us after Maghrib for dinner and community gathering.</p><p>Families are welcome.</p>",
  "date": "2026-06-19T10:00:00.000Z",
  "eventDate": "2026-06-21T18:00:00.000Z",
  "locationId": "665f1c2a91f1d8c62bc00001",
  "lang": "en"
}
```

If not found:

```http
404
```

```json
{
  "message": "Announcement not found"
}
```

### Get Daily Quiz

```http
GET /api/quiz/daily?lang=en&deviceId=device-123
```

Response:

```json
[
  {
    "id": "665f1c2a91f1d8c62bc00004",
    "question": "How many daily prayers are obligatory?",
    "options": ["3", "4", "5", "6"],
    "correctIndex": 2,
    "explanation": "There are five obligatory daily prayers.",
    "category": "fiqh"
  }
]
```

Rules:

- Return up to 20 active questions.
- Use `lang` to choose localized `question`, `options`, and `explanation`.
- Prefer random questions.
- Track questions seen by `deviceId`.
- Exclude questions seen by that device in the last 30 days.
- If there are not enough questions, relax the exclusion window to 7 days.
- If still not enough, return available questions rather than failing.

### Register Push Token

```http
POST /api/push/register
Content-Type: application/json
```

Request:

```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "deviceId": "device-123",
  "lang": "en"
}
```

Response:

```json
{
  "ok": true
}
```

Rules:

- Upsert by `deviceId`.
- Store `token`, `deviceId`, `lang`, `createdAt`, `updatedAt`, and `isActive`.
- Validate `lang` is `en` or `ru`.

## Error Format

Use this shape for errors:

```json
{
  "message": "Human readable error",
  "code": "OPTIONAL_MACHINE_CODE"
}
```

Recommended status codes:

- `400` validation error
- `401` unauthenticated admin
- `403` unauthorized admin
- `404` not found
- `500` server error

## MongoDB Models

### Mosque Model

Fields:

- `name: string`
- `address: string`
- `phone?: string`
- `hours?: string`
- `image?: string`
- `lat: number`
- `lng: number`
- `jumuahTimes.first?: string`
- `jumuahTimes.second?: string`
- `isActive: boolean`
- `sortOrder?: number`
- `createdAt`
- `updatedAt`

### MosquePrayerTime Model

Fields:

- `mosqueId: ObjectId`
- `date: string` formatted as `YYYY-MM-DD`
- `times.fajr: string` formatted as `HH:mm`
- `times.dhuhr: string` formatted as `HH:mm`
- `times.asr: string` formatted as `HH:mm`
- `times.maghrib: string` formatted as `HH:mm`
- `times.isha: string` formatted as `HH:mm`
- `createdAt`
- `updatedAt`

Indexes:

- unique `{ mosqueId: 1, date: 1 }`
- `{ date: 1 }`

### HalalPlace Model

Fields:

- `name: string`
- `category: 'restaurant' | 'grocery' | 'fast_food' | 'supermarket_halal'`
- `address: string`
- `phone?: string`
- `hours?: string`
- `image: string`
- `descriptionHtml: string`
- `lat: number`
- `lng: number`
- `city?: string`
- `isActive: boolean`
- `sortOrder?: number`
- `createdAt`
- `updatedAt`

### Announcement Model

Fields:

- `title: { en: string; ru: string }`
- `excerpt: { en: string; ru: string }`
- `image: string`
- `descriptionHtml: { en: string; ru: string }`
- `date: Date`
- `eventDate?: Date`
- `locationId?: ObjectId`
- `status: 'draft' | 'published'`
- `sendPushOnPublish: boolean`
- `pushSentAt?: Date`
- `createdAt`
- `updatedAt`

### QuizQuestion Model

Fields:

- `question: { en: string; ru: string }`
- `options: { en: string[]; ru: string[] }`
- `correctIndex: number`
- `explanation: { en: string; ru: string }`
- `category: 'aqeedah' | 'fiqh' | 'seerah' | 'quran' | 'hadith'`
- `isActive: boolean`
- `createdAt`
- `updatedAt`

Validation:

- `options.en.length === 4`
- `options.ru.length === 4`
- `correctIndex >= 0 && correctIndex <= 3`

### QuizSeen Model

Fields:

- `deviceId: string`
- `questionId: ObjectId`
- `seenAt: Date`

Indexes:

- `{ deviceId: 1, questionId: 1 }`
- `{ deviceId: 1, seenAt: -1 }`

### PushRegistration Model

Fields:

- `deviceId: string`
- `token: string`
- `lang: 'en' | 'ru'`
- `isActive: boolean`
- `createdAt`
- `updatedAt`

Indexes:

- unique `{ deviceId: 1 }`
- `{ lang: 1, isActive: 1 }`

### AdminUser Model

Fields:

- `email: string`
- `passwordHash: string`
- `role: 'admin'`
- `isActive: boolean`
- `createdBy?: ObjectId`
- `lastLoginAt?: Date`
- `createdAt`
- `updatedAt`

Rules:

- There is no public signup/register endpoint.
- The first admin user is created by a seed/bootstrap script.
- After bootstrap, new admin users are created manually from the protected admin panel by an existing logged-in admin.
- Only users with `role === 'admin'` and `isActive === true` may access the admin panel or admin API.
- Passwords must be hashed with bcrypt or argon2.
- Never return `passwordHash` from any API response.

## Admin API

All admin routes require JWT auth except login. The JWT must include the admin user id and role. Every protected admin request must verify:

- token is valid
- user still exists
- user is active
- user role is `admin`

### Auth

```http
POST /api/admin/auth/login
```

Request:

```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

Response:

```json
{
  "token": "jwt",
  "user": {
    "id": "665f1c2a91f1d8c62bc00010",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

If login succeeds, update `lastLoginAt`.

No endpoint like `POST /api/admin/auth/register` should exist.

### Admin Users

Only authenticated active admins can manage admin users.

```http
GET    /api/admin/users
POST   /api/admin/users
GET    /api/admin/users/:id
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id
```

Create request:

```json
{
  "email": "new-admin@example.com",
  "password": "temporary-password",
  "role": "admin",
  "isActive": true
}
```

Rules:

- `role` currently supports only `admin`.
- `email` must be unique.
- `password` is required on create.
- On update, password is optional; if provided, hash and replace it.
- `DELETE` may hard-delete or deactivate, but deactivation is preferred.
- An admin should not be able to deactivate/delete their own account unless another active admin remains.

### Admin CRUD Routes

Implement standard list/create/update/delete routes for:

```txt
/api/admin/users
/api/admin/mosques
/api/admin/mosque-prayer-times
/api/admin/halal-places
/api/admin/announcements
/api/admin/quiz-questions
```

Required route shape:

```http
GET    /api/admin/mosques
POST   /api/admin/mosques
GET    /api/admin/mosques/:id
PUT    /api/admin/mosques/:id
DELETE /api/admin/mosques/:id
```

Use the same pattern for mosque prayer times, halal places, announcements, and quiz questions.

Additional admin utility/read-only routes:

```http
GET  /api/admin/dashboard
GET  /api/admin/push-registrations
POST /api/admin/quiz-questions/import
```

`GET /api/admin/dashboard` returns counts for mosques, halal places, published announcements, active quiz questions, active push devices, and active admin users.

`GET /api/admin/push-registrations` returns a paginated read-only list of push registrations and supports `search` and `lang`.

`POST /api/admin/quiz-questions/import` accepts:

```json
{
  "items": [
    {
      "question": {
        "en": "How many daily prayers are obligatory?",
        "ru": "Сколько обязательных ежедневных молитв?"
      },
      "options": {
        "en": ["3", "4", "5", "6"],
        "ru": ["3", "4", "5", "6"]
      },
      "correctIndex": 2,
      "explanation": {
        "en": "There are five obligatory daily prayers.",
        "ru": "Обязательных ежедневных молитв пять."
      },
      "category": "fiqh",
      "isActive": true
    }
  ]
}
```

Additional mosque prayer-time import route:

```http
POST /api/admin/mosques/:id/prayer-times/import
Content-Type: application/json
```

Request:

```json
{
  "items": [
    {
      "date": "2026-06-19",
      "times": {
        "fajr": "01:21",
        "dhuhr": "13:25",
        "asr": "17:50",
        "maghrib": "22:04",
        "isha": "23:19"
      }
    }
  ]
}
```

Behavior:

- upsert by `mosqueId + date`
- validate all times are `HH:mm`
- return import summary with created/updated counts

Admin list responses may be wrapped for pagination:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```

Support query params:

- `page`
- `pageSize`
- `search`
- `lang` for push registrations
- `category` for halal places and quiz
- `status` for announcements

### Upload Endpoint

```http
POST /api/admin/uploads
Content-Type: multipart/form-data
```

Response:

```json
{
  "url": "https://example.com/uploads/file.jpg"
}
```

Use this for mosque images, halal place images, and announcement images.

### Publish Announcement + Push

When an announcement changes from `draft` to `published` and `sendPushOnPublish === true`:

- send push notifications to active push registrations using each device registration language
- notification title: localized announcement title for the device language
- notification body: localized announcement excerpt for the device language
- include deep-link data:

```json
{
  "type": "announcement",
  "id": "announcement-id"
}
```

Use Expo push service for Expo push tokens.

## Admin Panel Requirements

Build a React admin panel with Material UI.

### Pages

1. Login
2. Dashboard
3. Admin Users
4. Mosques
5. Mosque Prayer Times
6. Halal Places
7. Announcements
8. Quiz Questions
9. Push Registrations, read-only

### Dashboard

Show cards for:

- total mosques
- total halal places
- published announcements
- active quiz questions
- registered push devices
- active admin users

### Admin Users Page

Features:

- accessible only after admin login
- table with email, role, active status, last login, created date
- create admin user manually
- edit email, active status, and password
- no public user registration
- role select currently has only `admin`
- prevent deleting/deactivating the final active admin account
- do not display password hashes

### Mosques Page

Features:

- table with image, name, address, phone, hours, Jumu'ah times, active status
- create/edit dialog or page
- image upload
- place autocomplete for address that fills hidden lat/lng fields
- link/button to manage prayer times for each mosque
- optional map preview is nice but not required
- delete or deactivate

### Mosque Prayer Times Page

Features:

- select mosque
- date-range picker
- table by date with columns: Fajr, Dhuhr, Asr, Maghrib, Isha
- create/edit per date
- bulk date-range entry form that creates one section per selected date, each with Fajr, Dhuhr, Asr, Maghrib, and Isha inputs
- validate all prayer times as `HH:mm`
- show clear note: mobile app uses these API times when present, otherwise falls back to local calculation

### Halal Places Page

Features:

- table with image, name, category, city, address, phone, hours, active status
- category select with exact values:
  - `restaurant`
  - `grocery`
  - `fast_food`
- `supermarket_halal`
- image upload
- place autocomplete for address that fills hidden lat/lng fields and city when available; if city is already filled, suggestions are biased to that city
- RichText editor for `descriptionHtml`
- create/edit/delete

### Announcements Page

Features:

- table with image, title, status, date, event date
- create/edit form
- language tabs for `en` and `ru`
- localized title and excerpt
- image upload
- localized RichText editor for `descriptionHtml`
- optional linked mosque/location
- draft/published status
- toggle: send push on publish

### Quiz Questions Page

Features:

- table with question, category, active status
- create/edit form
- language tabs for `en` and `ru`
- category select:
  - `aqeedah`
  - `fiqh`
  - `seerah`
  - `quran`
  - `hadith`
- exactly 4 answer option inputs
- answer options are localized per language tab
- correct answer select, index 0-3
- explanation textarea
- active toggle
- bulk import from JSON

### Push Registrations Page

Features:

- read-only table
- deviceId
- token preview
- lang
- active status
- created/updated dates

## Seed Data

Create seed scripts for:

- one bootstrap admin user
- starter mosques
- starter halal places
- optional sample announcements
- quiz question import from JSON

Expected command examples:

```bash
npm run seed:admin
npm run seed:locations
npm run seed:quiz
```

## Implementation Details

This repository now contains a TypeScript MERN implementation:

- `server/`: Express, Mongoose models, public mobile REST API, protected admin API, local image uploads, Expo push integration, and seed scripts.
- `client/`: Vite React admin panel using Material UI with login, dashboard, CRUD pages, prayer-time import, quiz import, and read-only push registrations.

### Local setup

```bash
npm install
cp .env.example .env
npm run seed:admin
npm run seed:locations
npm run seed:quiz
npm run dev
```

The API runs on `http://localhost:4000` and the admin panel runs on `http://localhost:5173` by default. Set `MONGO_URI`, `JWT_SECRET`, `API_PUBLIC_URL`, and bootstrap admin credentials in `.env`.

After the first bootstrap admin exists, additional admin users must be created manually from the Admin Users page in the protected admin panel.

## Environment Variables

```env
MONGO_URI=mongodb://127.0.0.1:27017/jumuah
JWT_SECRET=change-me-in-production
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me-now
API_PUBLIC_URL=http://localhost:4000
CLIENT_ORIGIN=http://localhost:5173
PORT=4000
```

## Implementation Notes

- Public mobile endpoints must return only active/published data.
- Convert Mongo `_id` to `id` in all mobile responses.
- Do not expose admin-only fields in mobile responses.
- Keep all date values as ISO strings in JSON.
- Keep `hours` simple for now: `HH:mm-HH:mm`.
- Store mosque prayer-time dates as `YYYY-MM-DD` strings so timetable lookups are stable and timezone-safe.
- Store rich text HTML in `descriptionHtml`.
- Do not build public admin signup. Admin users are manually created by existing admins only.
- Protect the entire admin panel route tree on the frontend; unauthenticated users should be redirected to login.
- Protect every `/api/admin/*` route on the backend with JWT + active admin role checks.
- Admin UI can use wrapped paginated responses, but mobile public endpoints should return plain arrays/objects as documented.
- Use TypeScript types/shared DTOs where practical.

## Acceptance Checklist

- `GET /api/locations/mosques?lang=en` returns `Mosque[]`
- `GET /api/locations/mosques/:id/prayer-times?from=2026-06-19&to=2026-06-26` returns `MosquePrayerTime[]`
- `GET /api/locations/halal?lang=en` returns `HalalPlace[]`
- `GET /api/community/announcements?lang=en` returns `Announcement[]`
- `GET /api/community/announcements/:id?lang=en` returns one `Announcement`
- `GET /api/quiz/daily?lang=en&deviceId=abc` returns `QuizQuestion[]`
- `POST /api/push/register` upserts push token and returns `{ "ok": true }`
- Admin can log in
- Admin panel is inaccessible unless logged in
- There is no public admin registration/signup route
- Logged-in admin can manually create/edit/deactivate other admin users
- Backend rejects `/api/admin/*` requests without an active `admin` JWT
- Admin can create/edit/delete mosques
- Admin can upload mosque images
- Admin can create/edit/import mosque prayer times by date
- Admin can create/edit/delete halal places
- Admin can upload halal place images and edit rich text descriptions
- Admin can create/edit/publish announcements
- Admin can upload announcement images and edit rich text descriptions
- Admin can create/edit/delete/import quiz questions
- Published announcements can send push notifications using each device registration language
