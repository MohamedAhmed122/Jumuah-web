import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import ZoomInOutlinedIcon from "@mui/icons-material/ZoomInOutlined";
import ZoomOutOutlinedIcon from "@mui/icons-material/ZoomOutOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, Paged, uploadImage } from "../api/client";
import PlaceAutocomplete, { PlaceOption } from "../components/PlaceAutocomplete";
import RichTextHtmlEditor from "../components/RichTextHtmlEditor";

type Lang = "en" | "ru" | "lt";
type LocalizedText = Partial<Record<Lang, string>>;
type Mosque = { id: string; name: string };
type CalendarSource = "event" | "announcement";
type CalendarItem = {
  id: string;
  type: CalendarSource;
  title: string;
  startsAt: Date;
  endsAt?: Date;
  status: string;
  isPinned?: boolean;
  attendeeCount?: number;
  capacity?: number;
};

type OutsideLocation = { address: string; lat?: number; lng?: number };
type CalendarDraft = {
  type: CalendarSource;
  title: Record<Lang, string>;
  descriptionHtml: Record<Lang, string>;
  image: string;
  mosqueIds: string[];
  eventDate: string;
  endDate: string;
  locationType: "mosque" | "outside";
  locationMosqueId: string;
  outsideLocation: OutsideLocation;
  status: "draft" | "published" | "cancelled";
  registrationEnabled: boolean;
  capacity: string;
  sendPushOnPublish: boolean;
  isPinned: boolean;
};

type EventRow = {
  id: string;
  title: LocalizedText;
  eventDate: string;
  endDate?: string;
  status: "draft" | "published" | "cancelled";
  isPinned?: boolean;
  attendeeCount?: number;
  capacity?: number;
};

type AnnouncementRow = {
  id: string;
  title: LocalizedText;
  date: string;
  eventDate?: string;
  endDate?: string;
  status: "draft" | "published";
  isPinned?: boolean;
};

const dayFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short" });
const rangeFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });
const timeFormatter = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const zoomLevels = [
  { label: "Fit", rowHeight: 48, scroll: false },
  { label: "Normal", rowHeight: 82, scroll: true },
  { label: "Detailed", rowHeight: 124, scroll: true }
];
const languages: Array<{ value: Lang; label: string }> = [
  { value: "en", label: "English" },
  { value: "ru", label: "Russian" },
  { value: "lt", label: "Lithuanian" }
];

function startOfWeek(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const weekday = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - weekday);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function localDateTimeParam(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function titleText(value: unknown, fallback = "Untitled") {
  if (typeof value === "string") return value.trim() || fallback;
  if (!value || typeof value !== "object") return fallback;
  const localized = value as Partial<Record<Lang, unknown>>;
  for (const language of ["en", "ru", "lt"] as const) {
    const text = localized[language];
    if (typeof text === "string" && text.trim()) return text.trim();
  }
  return fallback;
}

function createAt(date: Date, hour: number) {
  const next = new Date(date);
  next.setHours(hour, 0, 0, 0);
  return localDateTimeParam(next);
}

function hasText(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0;
}

function hourValue(date: Date) {
  return date.getHours() + date.getMinutes() / 60;
}

function layoutDayItems(items: CalendarItem[]) {
  const sorted = [...items]
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())
    .map((item) => {
      const start = item.startsAt.getTime();
      const end = Math.max((item.endsAt ?? new Date(start + 45 * 60 * 1000)).getTime(), start + 30 * 60 * 1000);
      return { ...item, start, end };
    });
  const clusters: Array<typeof sorted> = [];

  for (const item of sorted) {
    const currentCluster = clusters[clusters.length - 1];
    const clusterEnd = currentCluster ? Math.max(...currentCluster.map((clusterItem) => clusterItem.end)) : 0;
    if (!currentCluster || item.start >= clusterEnd) {
      clusters.push([item]);
    } else {
      currentCluster.push(item);
    }
  }

  return clusters.flatMap((cluster) => {
    const lanes: number[] = [];
    const positioned = cluster.map((item) => {
      const lane = lanes.findIndex((laneEnd) => laneEnd <= item.start);
      const nextLane = lane === -1 ? lanes.length : lane;
      lanes[nextLane] = item.end;
      return { ...item, lane: nextLane };
    });
    const laneCount = Math.max(1, lanes.length);
    return positioned.map((item) => ({ ...item, laneCount }));
  });
}

function emptyDraft(type: CalendarSource, mosqueId: string, eventDate: string): CalendarDraft {
  return {
    type,
    title: { en: "", ru: "", lt: "" },
    descriptionHtml: { en: "<p></p>", ru: "<p></p>", lt: "<p></p>" },
    image: "",
    mosqueIds: mosqueId ? [mosqueId] : [],
    eventDate,
    endDate: "",
    locationType: "mosque",
    locationMosqueId: mosqueId,
    outsideLocation: { address: "" },
    status: "draft",
    registrationEnabled: true,
    capacity: "",
    sendPushOnPublish: false,
    isPinned: false
  };
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [mosqueId, setMosqueId] = useState(searchParams.get("mosqueId") ?? "");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [events, setEvents] = useState<EventRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [creating, setCreating] = useState<CalendarDraft | null>(null);
  const [activeLang, setActiveLang] = useState<Lang>("en");
  const [zoomIndex, setZoomIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const days = useMemo(() => Array.from({ length: 7 }, (_value, index) => addDays(weekStart, index)), [weekStart]);
  const calendarItems = useMemo<CalendarItem[]>(() => {
    const eventItems = events.map((event) => ({
      id: event.id,
      type: "event" as const,
      title: titleText(event.title),
      startsAt: new Date(event.eventDate),
      endsAt: event.endDate ? new Date(event.endDate) : undefined,
      status: event.status,
      isPinned: event.isPinned,
      attendeeCount: event.attendeeCount,
      capacity: event.capacity
    }));
    const announcementItems = announcements.map((announcement) => ({
      id: announcement.id,
      type: "announcement" as const,
      title: titleText(announcement.title),
      startsAt: new Date(announcement.eventDate || announcement.date),
      endsAt: announcement.endDate ? new Date(announcement.endDate) : undefined,
      status: announcement.status,
      isPinned: announcement.isPinned
    }));
    return [...eventItems, ...announcementItems].sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
  }, [events, announcements]);
  const visibleHours = useMemo(() => {
    const weekItems = calendarItems.filter((item) => days.some((day) => sameDay(item.startsAt, day)));
    if (!weekItems.length) return Array.from({ length: 11 }, (_value, index) => index + 8);
    const firstHour = Math.max(0, Math.min(...weekItems.map((item) => item.startsAt.getHours())) - 1);
    const lastHour = Math.min(23, Math.max(...weekItems.map((item) => (item.endsAt ?? item.startsAt).getHours())) + 1);
    return Array.from({ length: lastHour - firstHour + 1 }, (_value, index) => firstHour + index);
  }, [calendarItems, days]);
  const zoom = zoomLevels[zoomIndex];
  const visibleStartHour = visibleHours[0] ?? 8;
  const visibleEndHour = (visibleHours[visibleHours.length - 1] ?? 18) + 1;
  const calendarBodyHeight = visibleHours.length * zoom.rowHeight;

  useEffect(() => {
    void api.get<Paged<Mosque>>("/api/admin/mosques", { params: { pageSize: 100 } })
      .then(({ data }) => {
        setMosques(data.items);
        if (!mosqueId && data.items[0]) {
          setMosqueId(data.items[0].id);
          setSearchParams({ mosqueId: data.items[0].id }, { replace: true });
        }
      })
      .catch((requestError: any) => setError(requestError.response?.data?.message ?? "Mosques could not be loaded."));
  }, []);

  async function loadCalendarItems() {
    if (!mosqueId) return;
    setError("");
    const [eventsResponse, announcementsResponse] = await Promise.all([
      api.get<Paged<EventRow>>("/api/admin/events", { params: { mosqueId, pageSize: 100 } }),
      api.get<Paged<AnnouncementRow>>("/api/admin/announcements", { params: { mosqueId, pageSize: 100 } })
    ]);
    setEvents(eventsResponse.data.items);
    setAnnouncements(announcementsResponse.data.items);
  }

  useEffect(() => {
    if (!mosqueId) return;
    void loadCalendarItems()
      .catch((requestError: any) => setError(requestError.response?.data?.message ?? "Calendar items could not be loaded."));
  }, [mosqueId]);

  function createItem(type: CalendarSource, startsAt = localDateTimeParam(new Date())) {
    setActiveLang("en");
    setError("");
    setCreating(emptyDraft(type, mosqueId, startsAt));
  }

  function openItem(item: CalendarItem) {
    const target = item.type === "event" ? "/events" : "/announcements";
    navigate(`${target}?mosqueId=${mosqueId}`);
  }

  function patchCreating(patch: Partial<CalendarDraft>) {
    setCreating((current) => current ? { ...current, ...patch } : current);
  }

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !creating) return;
    setUploading(true);
    setError("");
    try {
      const image = await uploadImage(file);
      patchCreating({ image });
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Image could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  function validateDraft(draft: CalendarDraft) {
    if (!draft.mosqueIds.length) return "Select at least one audience mosque.";
    if (!draft.image) return `Upload ${draft.type === "event" ? "an event" : "an announcement"} image.`;
    if (languages.some((language) => !draft.title[language.value].trim())) return "Add the title in English, Russian and Lithuanian.";
    if (languages.some((language) => !hasText(draft.descriptionHtml[language.value]))) return "Add the description in English, Russian and Lithuanian.";
    if (!draft.eventDate) return "Date is required.";
    if (draft.endDate && draft.endDate < draft.eventDate) return "End date must be after the start date.";
    if (draft.locationType === "mosque" && !draft.locationMosqueId) return "Select the location mosque.";
    if (draft.locationType === "outside" && (!draft.outsideLocation.address || !Number.isFinite(draft.outsideLocation.lat) || !Number.isFinite(draft.outsideLocation.lng))) {
      return "Select an outside address from autocomplete.";
    }
    if (draft.type === "event" && draft.capacity !== "" && (!Number.isInteger(Number(draft.capacity)) || Number(draft.capacity) < 1)) {
      return "Capacity must be a whole number greater than zero.";
    }
    return "";
  }

  async function saveDraft() {
    if (!creating) return;
    const validationError = validateDraft(creating);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const commonPayload = {
        title: creating.title,
        image: creating.image,
        descriptionHtml: creating.descriptionHtml,
        mosqueIds: creating.mosqueIds,
        endDate: creating.endDate || null,
        locationType: creating.locationType,
        locationMosqueId: creating.locationType === "mosque" ? creating.locationMosqueId : "",
        outsideLocation: creating.locationType === "outside" ? creating.outsideLocation : null,
        isPinned: creating.isPinned
      };
      if (creating.type === "event") {
        await api.post("/api/admin/events", {
          ...commonPayload,
          eventDate: creating.eventDate,
          status: creating.status,
          registrationEnabled: creating.registrationEnabled,
          capacity: creating.capacity === "" ? null : Number(creating.capacity)
        });
      } else {
        await api.post("/api/admin/announcements", {
          ...commonPayload,
          date: creating.eventDate,
          eventDate: creating.eventDate,
          status: creating.status === "cancelled" ? "draft" : creating.status,
          sendPushOnPublish: creating.sendPushOnPublish,
          hideAfterEndDate: false,
          deleteAfterEndDate: false
        });
      }
      setCreating(null);
      await loadCalendarItems();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Calendar item could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const weekEnd = addDays(weekStart, 6);

  return (
    <>
      <Stack direction={{ xs: "column", lg: "row" }} alignItems={{ xs: "stretch", lg: "flex-end" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: "2rem", sm: "2.125rem" } }}>Calendar</Typography>
          <Typography color="text.secondary">Events and announcements for the selected mosque</Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <FormControl size="small" sx={{ width: { xs: "100%", sm: 260 } }}>
            <InputLabel>Mosque</InputLabel>
            <Select label="Mosque" value={mosqueId} onChange={(event) => {
              const nextMosqueId = event.target.value;
              setMosqueId(nextMosqueId);
              setSearchParams({ mosqueId: nextMosqueId }, { replace: true });
            }}>
              {mosques.map((mosque) => <MenuItem key={mosque.id} value={mosque.id}>{mosque.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<AddOutlinedIcon />} disabled={!mosqueId} onClick={() => createItem("announcement")} sx={{ width: { xs: "100%", sm: "auto" } }}>Announcement</Button>
          <Button variant="contained" startIcon={<AddOutlinedIcon />} disabled={!mosqueId} onClick={() => createItem("event")} sx={{ width: { xs: "100%", sm: "auto" } }}>Event</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="outlined" startIcon={<ChevronLeftOutlinedIcon />} onClick={() => setWeekStart(addDays(weekStart, -7))}>Previous</Button>
            <Button variant="outlined" startIcon={<TodayOutlinedIcon />} onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</Button>
            <Button variant="outlined" endIcon={<ChevronRightOutlinedIcon />} onClick={() => setWeekStart(addDays(weekStart, 7))}>Next</Button>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: "center", md: "flex-start" }}>
            <CalendarMonthOutlinedIcon color="primary" />
            <Typography variant="h6">{rangeFormatter.format(weekStart)} - {rangeFormatter.format(weekEnd)}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} justifyContent={{ xs: "center", md: "flex-start" }} flexWrap="wrap" useFlexGap>
            <Chip label="Events" sx={{ bgcolor: "#d7f4ee", color: "#0f766e", borderColor: "#0f766e" }} variant="outlined" />
            <Chip label="Announcements" sx={{ bgcolor: "#ede9fe", color: "#6d28d9", borderColor: "#6d28d9" }} variant="outlined" />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <Button
              variant="outlined"
              startIcon={<ZoomOutOutlinedIcon />}
              disabled={zoomIndex === 0}
              onClick={() => setZoomIndex((current) => Math.max(0, current - 1))}
            >
              Zoom out
            </Button>
            <Chip label={zoom.label} sx={{ alignSelf: { xs: "center", sm: "auto" } }} />
            <Button
              variant="outlined"
              endIcon={<ZoomInOutlinedIcon />}
              disabled={zoomIndex === zoomLevels.length - 1}
              onClick={() => setZoomIndex((current) => Math.min(zoomLevels.length - 1, current + 1))}
            >
              Zoom in
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ overflowX: "auto", overflowY: zoom.scroll ? "auto" : "hidden", maxHeight: zoom.scroll ? { xs: "calc(100vh - 360px)", sm: "calc(100vh - 300px)" } : "none", width: "100%" }}>
        <Box sx={{ minWidth: { xs: 980, lg: 1120 } }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "72px repeat(7, minmax(140px, 1fr))", borderBottom: 1, borderColor: "divider" }}>
            <Box sx={{ p: 1.5, color: "text.secondary", fontWeight: 700 }}>Time</Box>
            {days.map((day) => (
              <Box key={day.toISOString()} sx={{ p: 1.5, borderLeft: 1, borderColor: "divider", bgcolor: sameDay(day, new Date()) ? "action.hover" : "background.paper" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{dayFormatter.format(day)}</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "72px repeat(7, minmax(140px, 1fr))", minHeight: calendarBodyHeight }}>
            <Box sx={{ position: "relative", height: calendarBodyHeight }}>
              {visibleHours.map((hour, index) => (
                <Box key={hour} sx={{ height: zoom.rowHeight, borderBottom: 1, borderColor: "divider", p: 1, color: "text.secondary", fontWeight: 700 }}>
                  {String(hour).padStart(2, "0")}:00
                </Box>
              ))}
            </Box>
            {days.map((day) => {
              const dayItems = layoutDayItems(calendarItems.filter((item) => sameDay(item.startsAt, day)));
              return (
                <Box
                  key={day.toISOString()}
                  sx={{
                    position: "relative",
                    height: calendarBodyHeight,
                    borderLeft: 1,
                    borderColor: "divider",
                    bgcolor: sameDay(day, new Date()) ? "rgba(19, 111, 99, 0.04)" : "background.paper",
                    overflow: "hidden"
                  }}
                >
                  {visibleHours.map((hour, index) => (
                    <Box
                      key={`${day.toISOString()}-${hour}`}
                      onDoubleClick={() => createItem("event", createAt(day, hour))}
                      sx={{
                        position: "absolute",
                        top: index * zoom.rowHeight,
                        left: 0,
                        right: 0,
                        height: zoom.rowHeight,
                        borderBottom: 1,
                        borderColor: "divider"
                      }}
                    />
                  ))}
                  {dayItems.map((item) => {
                    const isEvent = item.type === "event";
                    const startHour = hourValue(item.startsAt);
                    const endDate = item.endsAt ?? new Date(item.startsAt.getTime() + 45 * 60 * 1000);
                    const endHour = sameDay(endDate, item.startsAt) ? hourValue(endDate) : 24;
                    const top = Math.max(4, (startHour - visibleStartHour) * zoom.rowHeight + 4);
                    const bottom = Math.min(calendarBodyHeight - 4, (Math.min(endHour, visibleEndHour) - visibleStartHour) * zoom.rowHeight - 4);
                    const height = Math.max(zoomIndex === 0 ? 34 : 54, bottom - top);
                    const laneGap = 4;
                    const width = `calc((100% - ${(item.laneCount + 1) * laneGap}px) / ${item.laneCount})`;
                    const left = `calc(${laneGap}px + ${item.lane} * (${width} + ${laneGap}px))`;
                    return (
                      <Box
                        key={`${item.type}-${item.id}`}
                        onClick={() => openItem(item)}
                        sx={{
                          position: "absolute",
                          top,
                          left,
                          width,
                          height,
                          bgcolor: isEvent ? "#d7f4ee" : "#ede9fe",
                          border: 1,
                          borderColor: isEvent ? "#0f766e" : "#6d28d9",
                          borderLeft: 4,
                          borderRadius: 1,
                          cursor: "pointer",
                          overflow: "hidden",
                          p: zoomIndex === 0 ? 0.5 : 1
                        }}
                      >
                        <Typography variant="body2" sx={{ color: isEvent ? "#0f766e" : "#6d28d9", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: isEvent ? "#0f766e" : "#6d28d9", display: "block", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {timeFormatter.format(item.startsAt)}{item.endsAt ? `-${timeFormatter.format(item.endsAt)}` : ""} · {isEvent ? "Event" : "Announcement"}
                        </Typography>
                        {zoomIndex > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.status}{isEvent && item.attendeeCount != null ? ` · ${item.attendeeCount}${item.capacity ? `/${item.capacity}` : ""} attending` : ""}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Paper>

      <Dialog open={Boolean(creating)} onClose={() => !saving && setCreating(null)} maxWidth="md" fullWidth sx={{ "& .MuiDialog-paper": { m: { xs: 1, sm: 4 }, width: { xs: "calc(100% - 16px)", sm: "100%" } } }}>
        <DialogTitle>Create {creating?.type === "event" ? "event" : "announcement"}</DialogTitle>
        <DialogContent>
          {creating && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button component="label" variant="outlined" disabled={uploading} sx={{ minWidth: 180 }}>
                  {uploading ? "Uploading..." : creating.image ? "Change image" : "Upload image"}
                  <input hidden type="file" accept="image/*" onChange={(event) => void selectImage(event)} />
                </Button>
                {creating.image && <Avatar src={creating.image} variant="rounded" sx={{ width: 72, height: 72 }} />}
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" value={creating.status} onChange={(event) => patchCreating({ status: event.target.value as CalendarDraft["status"] })}>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="published">Published</MenuItem>
                    {creating.type === "event" && <MenuItem value="cancelled">Cancelled</MenuItem>}
                  </Select>
                </FormControl>
              </Stack>

              <Tabs value={activeLang} onChange={(_event, value: Lang) => setActiveLang(value)} variant="scrollable" scrollButtons="auto">
                {languages.map((language) => <Tab key={language.value} value={language.value} label={language.label} />)}
              </Tabs>
              <TextField
                label={`Title (${activeLang.toUpperCase()})`}
                value={creating.title[activeLang]}
                onChange={(event) => patchCreating({ title: { ...creating.title, [activeLang]: event.target.value } })}
                required
              />
              <RichTextHtmlEditor
                label={`Description (${activeLang.toUpperCase()})`}
                value={creating.descriptionHtml[activeLang]}
                onChange={(descriptionHtml) => patchCreating({ descriptionHtml: { ...creating.descriptionHtml, [activeLang]: descriptionHtml } })}
              />

              <FormControl fullWidth>
                <InputLabel>Audience mosques</InputLabel>
                <Select
                  multiple
                  label="Audience mosques"
                  value={creating.mosqueIds}
                  onChange={(event) => patchCreating({ mosqueIds: typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value })}
                  renderValue={(selected) => selected.map((id) => mosques.find((mosque) => mosque.id === id)?.name ?? id).join(", ")}
                >
                  {mosques.map((mosque) => (
                    <MenuItem key={mosque.id} value={mosque.id}>
                      <Checkbox checked={creating.mosqueIds.includes(mosque.id)} />
                      <ListItemText primary={mosque.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Location</FormLabel>
                <RadioGroup row={false} sx={{ flexDirection: { xs: "column", sm: "row" } }} value={creating.locationType} onChange={(event) => {
                  const locationType = event.target.value as CalendarDraft["locationType"];
                  patchCreating({ locationType, locationMosqueId: locationType === "mosque" ? creating.locationMosqueId || mosqueId : creating.locationMosqueId });
                }}>
                  <FormControlLabel value="mosque" control={<Radio />} label="Inside a mosque" />
                  <FormControlLabel value="outside" control={<Radio />} label="Outside a mosque" />
                </RadioGroup>
              </FormControl>
              {creating.locationType === "mosque" ? (
                <FormControl fullWidth>
                  <InputLabel>Location mosque</InputLabel>
                  <Select label="Location mosque" value={creating.locationMosqueId} onChange={(event) => patchCreating({ locationMosqueId: event.target.value })}>
                    {mosques.map((mosque) => <MenuItem key={mosque.id} value={mosque.id}>{mosque.name}</MenuItem>)}
                  </Select>
                </FormControl>
              ) : (
                <PlaceAutocomplete
                  label="Outside location"
                  value={creating.outsideLocation.address}
                  required
                  onAddressChange={(address) => patchCreating({
                    outsideLocation: address === creating.outsideLocation.address ? creating.outsideLocation : { address }
                  })}
                  onPlaceSelect={(place: PlaceOption) => patchCreating({ outsideLocation: { address: place.address, lat: place.lat, lng: place.lng } })}
                />
              )}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField fullWidth type="datetime-local" label={creating.type === "event" ? "Event date" : "Announcement date"} value={creating.eventDate} onChange={(event) => patchCreating({ eventDate: event.target.value })} InputLabelProps={{ shrink: true }} required />
                <TextField fullWidth type="datetime-local" label="End date" value={creating.endDate} onChange={(event) => patchCreating({ endDate: event.target.value })} InputLabelProps={{ shrink: true }} />
                {creating.type === "event" && (
                  <TextField fullWidth type="number" label="Capacity" value={creating.capacity} onChange={(event) => patchCreating({ capacity: event.target.value })} inputProps={{ min: 1, step: 1 }} />
                )}
              </Stack>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack>
                  {creating.type === "event" ? (
                    <FormControlLabel
                      control={<Checkbox checked={creating.registrationEnabled} onChange={(event) => patchCreating({ registrationEnabled: event.target.checked })} />}
                      label="Show Join button in the mobile app"
                    />
                  ) : (
                    <FormControlLabel
                      control={<Checkbox checked={creating.sendPushOnPublish} onChange={(event) => patchCreating({ sendPushOnPublish: event.target.checked })} />}
                      label="Send a push notification when published"
                    />
                  )}
                  <FormControlLabel
                    control={<Checkbox checked={creating.isPinned} onChange={(event) => patchCreating({ isPinned: event.target.checked })} />}
                    label={`Pin this ${creating.type}`}
                  />
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column-reverse", sm: "row" }, alignItems: { xs: "stretch", sm: "center" }, px: { xs: 2, sm: 3 } }}>
          <Button disabled={saving} onClick={() => setCreating(null)}>Cancel</Button>
          <Button variant="contained" disabled={saving || uploading} onClick={() => void saveDraft()}>{saving ? "Saving..." : "Create"}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
