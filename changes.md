# Change IQama times

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
