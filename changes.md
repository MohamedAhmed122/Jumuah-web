# 1. Change IQama times

## Summary

The admin backend now supports two different ways to define IQama time for each prayer:

- A minutes offset after Athan, for example `15` minutes after Dhuhr.
- An exact fixed IQama time, for example `20:10`.

For each prayer, only one of these values should be used. A prayer cannot have both a minutes offset and an exact time at the same time.

## Backend data model changes

The `Mosque` model still keeps the existing `iqamaOffsets` field, but each prayer value is now optional instead of required.

Existing shape:

```ts
iqamaOffsets?: {
  fajr?: number;
  dhuhr?: number;
  asr?: number;
  maghrib?: number;
  isha?: number;
};
```

A new optional `iqamaTimes` field was added to `Mosque` for exact fixed IQama times:

```ts
iqamaTimes?: {
  fajr?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
};
```

Exact times must use `HH:mm` 24-hour format, for example:

```json
{
  "maghrib": "20:10"
}
```

## Admin API changes

The existing endpoint path was kept for compatibility:

```http
GET /api/admin/mosques/:id/iqama-offsets
PUT /api/admin/mosques/:id/iqama-offsets
```

The response now includes both `iqamaOffsets` and `iqamaTimes`:

```json
{
  "mosqueId": "64f000000000000000000001",
  "iqamaOffsets": {
    "fajr": 20,
    "dhuhr": 15,
    "asr": 15,
    "isha": 15
  },
  "iqamaTimes": {
    "maghrib": "20:10"
  }
}
```

The `PUT` endpoint now accepts this shape:

```json
{
  "iqamaOffsets": {
    "fajr": 20,
    "dhuhr": 15,
    "asr": 15,
    "isha": 15
  },
  "iqamaTimes": {
    "maghrib": "20:10"
  }
}
```

Validation rules:

- Each prayer must have either `iqamaOffsets[prayer]` or `iqamaTimes[prayer]`.
- Each prayer must not have both values.
- Offsets must be whole numbers from `0` to `180`.
- Exact IQama times must match `HH:mm`, like `00:00`, `18:18`, or `23:59`.

## Mobile app change needed

When showing IQama times for a mosque, the mobile app should read both fields from the mosque object if they are available:

- If `iqamaTimes[prayer]` exists, show that exact time directly.
- Else if `iqamaOffsets[prayer]` exists, calculate IQama as Athan time plus that offset.
- Else there is no admin-provided IQama value for that prayer.

Suggested logic:

```ts
function getIqamaTime(
  prayer: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha",
  athanTime: string,
  mosque: {
    iqamaOffsets?: Partial<Record<string, number>>;
    iqamaTimes?: Partial<Record<string, string>>;
  }
) {
  const exactTime = mosque.iqamaTimes?.[prayer];
  if (exactTime) return exactTime;

  const offset = mosque.iqamaOffsets?.[prayer];
  if (offset != null) return addMinutesToTime(athanTime, offset);

  return null;
}
```

The important behavior is that exact IQama times should be treated as fixed times and should not be recalculated from Athan.

# 2. Change Lithuanian language support

## Summary

The backend now accepts Lithuanian (`lt`) in addition to English (`en`) and Russian (`ru`) for localized public/admin content.

Supported language values are now:

```ts
type Lang = "en" | "ru" | "lt";
```

## Announcement changes

Announcement admin records now require Lithuanian translations alongside English and Russian:

```ts
title: {
  en: string;
  ru: string;
  lt: string;
};

descriptionHtml: {
  en: string;
  ru: string;
  lt: string;
};
```

Public announcement endpoints now accept `?lang=lt`:

```http
GET /api/community/announcements?mosqueId=:mosqueId&lang=lt
GET /api/community/announcements/:id?mosqueId=:mosqueId&lang=lt
```

The public response still returns `title` and `descriptionHtml` as strings, localized to the requested language.

## Notification changes

Notification admin records now require Lithuanian translations alongside English and Russian:

```ts
title: {
  en: string;
  ru: string;
  lt: string;
};

description: {
  en: string;
  ru: string;
  lt: string;
};
```

Public notification endpoints now accept `?lang=lt`:

```http
GET /api/community/notifications?mosqueId=:mosqueId&screen=main&lang=lt
GET /api/community/notifications/:id?mosqueId=:mosqueId&lang=lt
```

Push registration now also accepts Lithuanian:

```json
{
  "token": "ExponentPushToken[...]",
  "deviceId": "device-123",
  "lang": "lt",
  "mosqueIds": ["64f000000000000000000001"]
}
```

When a Lithuanian device receives announcement or notification pushes, the backend uses the Lithuanian title/body.

## Halal Place changes

Halal Place `descriptionHtml` is now localized. Admin records should store:

```ts
descriptionHtml: {
  en: string;
  ru: string;
  lt: string;
};
```

The public halal endpoint now accepts `?lang=lt`, `?lang=ru`, or `?lang=en`:

```http
GET /api/locations/halal?lang=lt
```

The public response shape is intentionally preserved. `descriptionHtml` is still returned as a string:

```json
{
  "id": "64f000000000000000000001",
  "name": "Halal Restaurant",
  "descriptionHtml": "<p>Lithuanian description here.</p>"
}
```

Mobile app logic should request the current app language with halal places too. If the app language is Lithuanian, call:

```http
GET /api/locations/halal?lang=lt
```

Localized fields fall back to English if the requested language value is missing.
