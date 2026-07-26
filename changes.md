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

# 3. Change Events support

## Summary

The backend now has a separate Events feature. Events are similar to announcements, but they represent things users can attend. The mobile app should show a Join button for events when registration is enabled.

Events are mosque-scoped and localized in English, Russian and Lithuanian.

## Backend data model changes

A new `Event` model was added:

```ts
type Event = {
  id: string;
  title: {
    en: string;
    ru: string;
    lt: string;
  };
  image: string;
  descriptionHtml: {
    en: string;
    ru: string;
    lt: string;
  };
  mosqueIds: string[];
  eventDate: string;
  endDate?: string;
  locationType: "mosque" | "outside";
  locationMosqueId?: string;
  outsideLocation?: {
    address: string;
    lat: number;
    lng: number;
  };
  status: "draft" | "published" | "cancelled";
  registrationEnabled: boolean;
  capacity?: number;
  isPinned: boolean;
  attendeeCount: number;
  joined?: boolean;
  isFull: boolean;
};
```

A new `EventAttendance` model was added:

```ts
type EventAttendance = {
  eventId: string;
  deviceId: string;
  lang: "en" | "ru" | "lt";
  isActive: boolean;
  joinedAt: string;
  cancelledAt?: string;
};
```

Each device can only have one attendance record per event. Leaving an event deactivates the attendance instead of deleting it.

## Public mobile API changes

List published events:

```http
GET /api/community/events?mosqueId=:mosqueId&lang=lt&deviceId=:deviceId
```

Get one event:

```http
GET /api/community/events/:id?mosqueId=:mosqueId&lang=lt&deviceId=:deviceId
```

Join an event:

```http
POST /api/community/events/:id/join
```

Body:

```json
{
  "deviceId": "device-123",
  "lang": "lt",
  "mosqueId": "64f000000000000000000001"
}
```

Leave an event:

```http
POST /api/community/events/:id/leave
```

Body:

```json
{
  "deviceId": "device-123"
}
```

The event list/detail response returns localized `title` and `descriptionHtml` as strings:

```json
{
  "id": "64f000000000000000000001",
  "title": "Community dinner",
  "descriptionHtml": "<p>Join us after Maghrib.</p>",
  "eventDate": "2026-08-01T17:00:00.000Z",
  "registrationEnabled": true,
  "capacity": 100,
  "attendeeCount": 24,
  "joined": false,
  "isFull": false,
  "lang": "en"
}
```

## Mobile app behavior needed

The mobile app should show the Join button when:

- `registrationEnabled` is `true`
- `status` is `published`
- `isFull` is `false`
- the event has not ended
- the user has not already joined

If `joined` is `true`, show a Joined state. If the app supports cancelling attendance, call the leave endpoint.

When the user taps Join, call:

```http
POST /api/community/events/:id/join
```

After a successful join, update local UI using the returned `joined` and `attendeeCount`.

## Admin API changes

Admin event routes:

```http
GET /api/admin/events
POST /api/admin/events
GET /api/admin/events/:id
PUT /api/admin/events/:id
DELETE /api/admin/events/:id
GET /api/admin/events/:id/attendees
```

The admin panel now has an Events page under mosque settings and the sidebar. Admins can create/edit events and see attendee counts.

# 4. Change Calendar support

## Summary

The admin panel now has a Calendar page for mosque-scoped scheduling. It shows Events and Announcements together in one weekly calendar view.

Events and announcements use different colors:

- Events use green/teal.
- Announcements use purple.
- Events do not use red.

## Admin panel changes

A new Calendar route was added:

```http
/calendar
```

The Calendar page is available from:

- The main admin sidebar.
- The Mosque Settings shortcut menu.

The Calendar page lets an admin:

- Select a mosque.
- Move between weeks.
- Return to the current week with Today.
- See Events and Announcements in the same week grid.
- Create a new Event from the Calendar.
- Create a new Announcement from the Calendar.

Creating from Calendar opens the existing Event or Announcement admin form with the selected mosque and date prefilled.

## Data shown in Calendar

Events use:

```ts
eventDate
endDate
title
status
attendeeCount
capacity
```

Announcements use:

```ts
eventDate || date
endDate
title
status
```

The Calendar uses the existing admin APIs:

```http
GET /api/admin/events?mosqueId=:mosqueId
GET /api/admin/announcements?mosqueId=:mosqueId
```

No mobile app change is required for the admin Calendar itself.
