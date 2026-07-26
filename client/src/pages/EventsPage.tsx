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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import { Link, useSearchParams } from "react-router-dom";
import { api, Paged, uploadImage } from "../api/client";
import PlaceAutocomplete, { PlaceOption } from "../components/PlaceAutocomplete";
import RichTextHtmlEditor from "../components/RichTextHtmlEditor";

type Lang = "en" | "ru" | "lt";
type LocalizedText = Record<Lang, string>;
type Mosque = { id: string; name: string };
type OutsideLocation = { address: string; lat?: number; lng?: number };
type EventItem = {
  id?: string;
  title: LocalizedText;
  descriptionHtml: LocalizedText;
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
  isPinned: boolean;
  attendeeCount: number;
  createdAt?: string;
};

const languages: Array<{ value: Lang; label: string }> = [
  { value: "en", label: "English" },
  { value: "ru", label: "Russian" },
  { value: "lt", label: "Lithuanian" }
];

function localDateTime(value?: string | Date) {
  const date = value ? new Date(value) : new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function localizedText(value: LocalizedText | string | undefined, fallback = ""): LocalizedText {
  if (typeof value === "string") return { en: value, ru: fallback, lt: fallback };
  return {
    en: value?.en ?? fallback,
    ru: value?.ru ?? fallback,
    lt: value?.lt ?? fallback
  };
}

function emptyEvent(mosqueId: string): EventItem {
  return {
    title: { en: "", ru: "", lt: "" },
    descriptionHtml: { en: "<p></p>", ru: "<p></p>", lt: "<p></p>" },
    image: "",
    mosqueIds: mosqueId ? [mosqueId] : [],
    eventDate: localDateTime(),
    endDate: "",
    locationType: "mosque",
    locationMosqueId: mosqueId,
    outsideLocation: { address: "" },
    status: "draft",
    registrationEnabled: true,
    capacity: "",
    isPinned: false,
    attendeeCount: 0
  };
}

function editableEvent(item: EventItem): EventItem {
  return {
    ...item,
    title: localizedText(item.title),
    descriptionHtml: localizedText(item.descriptionHtml, "<p></p>"),
    eventDate: localDateTime(item.eventDate),
    endDate: item.endDate ? localDateTime(item.endDate) : "",
    outsideLocation: item.outsideLocation ?? { address: "" },
    locationMosqueId: item.locationMosqueId ?? "",
    capacity: item.capacity == null ? "" : String(item.capacity),
    attendeeCount: item.attendeeCount ?? 0
  };
}

function hasText(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0;
}

export default function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [mosqueId, setMosqueId] = useState(searchParams.get("mosqueId") ?? "");
  const [rows, setRows] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [activeLang, setActiveLang] = useState<Lang>("en");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const mosqueNames = useMemo(() => new Map(mosques.map((mosque) => [mosque.id, mosque.name])), [mosques]);

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

  async function load() {
    if (!mosqueId) return;
    const { data } = await api.get<Paged<EventItem>>("/api/admin/events", {
      params: { mosqueId, search, status: status || undefined, pageSize: 100 }
    });
    setRows(data.items);
    setTotal(data.total);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((requestError: any) => setError(requestError.response?.data?.message ?? "Events could not be loaded."));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [mosqueId, search, status]);

  function openCreate() {
    setActiveLang("en");
    setError("");
    setEditing(emptyEvent(mosqueId));
  }

  function validate(item: EventItem) {
    if (!item.mosqueIds.length) return "Select at least one audience mosque.";
    if (!item.image) return "Upload an event image.";
    if (languages.some((language) => !item.title[language.value].trim())) return "Add the title in English, Russian and Lithuanian.";
    if (languages.some((language) => !hasText(item.descriptionHtml[language.value]))) return "Add the description in English, Russian and Lithuanian.";
    if (!item.eventDate) return "Event date is required.";
    if (item.endDate && item.endDate < item.eventDate) return "End date must be after the event date.";
    if (item.locationType === "mosque" && !item.locationMosqueId) return "Select the event mosque.";
    if (item.locationType === "outside" && (!item.outsideLocation.address || !Number.isFinite(item.outsideLocation.lat) || !Number.isFinite(item.outsideLocation.lng))) {
      return "Select an outside address from autocomplete.";
    }
    if (item.capacity !== "" && (!Number.isInteger(Number(item.capacity)) || Number(item.capacity) < 1)) return "Capacity must be a whole number greater than zero.";
    return "";
  }

  async function save() {
    if (!editing) return;
    const validationError = validate(editing);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...editing,
        endDate: editing.endDate || null,
        capacity: editing.capacity === "" ? null : Number(editing.capacity),
        locationMosqueId: editing.locationType === "mosque" ? editing.locationMosqueId : "",
        outsideLocation: editing.locationType === "outside" ? editing.outsideLocation : null
      };
      if (editing.id) await api.put(`/api/admin/events/${editing.id}`, payload);
      else await api.post("/api/admin/events", payload);
      setEditing(null);
      setMessage(editing.id ? "Event updated." : "Event created.");
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Event could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: EventItem) {
    if (!item.id || !confirm("Delete this event permanently? Attendance records will be deactivated.")) return;
    await api.delete(`/api/admin/events/${item.id}`);
    setMessage("Event deleted.");
    await load();
  }

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editing) return;
    setUploading(true);
    setError("");
    try {
      const image = await uploadImage(file);
      setEditing((current) => current ? { ...current, image } : current);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Image could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  function patch(patchValue: Partial<EventItem>) {
    setEditing((current) => current ? { ...current, ...patchValue } : current);
  }

  return (
    <>
      <Button component={Link} to="/mosques" startIcon={<ArrowBackOutlinedIcon />} sx={{ mb: 1 }}>Back to mosques</Button>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "flex-end" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Events</Typography>
          <Typography color="text.secondary">{total} events for the selected mosque</Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>Mosque</InputLabel>
            <Select label="Mosque" value={mosqueId} onChange={(event) => {
              const nextMosqueId = event.target.value;
              setMosqueId(nextMosqueId);
              setSearchParams({ mosqueId: nextMosqueId }, { replace: true });
            }}>
              {mosques.map((mosque) => <MenuItem key={mosque.id} value={mosque.id}>{mosque.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<EventAvailableOutlinedIcon />} disabled={!mosqueId} onClick={openCreate}>Create event</Button>
        </Stack>
      </Stack>

      {message && <Alert severity="success" onClose={() => setMessage("")} sx={{ mb: 2 }}>{message}</Alert>}
      {!editing && error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField size="small" label="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Paper sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Event</TableCell>
              <TableCell>Audience</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Attendees</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar src={item.image} variant="rounded" />
                    <Box>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        {item.isPinned && <PushPinOutlinedIcon color="secondary" fontSize="small" />}
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.title.en || item.title.ru || item.title.lt}</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{item.registrationEnabled ? "Join enabled" : "Join disabled"}</Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" gap={0.5} flexWrap="wrap">
                    {item.mosqueIds.map((id) => <Chip key={id} label={mosqueNames.get(id) ?? id} size="small" />)}
                  </Stack>
                </TableCell>
                <TableCell>{item.locationType === "mosque" ? mosqueNames.get(item.locationMosqueId) ?? "Mosque" : item.outsideLocation?.address ?? "Outside"}</TableCell>
                <TableCell><Chip label={item.status} color={item.status === "published" ? "success" : item.status === "cancelled" ? "error" : "default"} size="small" /></TableCell>
                <TableCell>{item.attendeeCount}{item.capacity ? ` / ${item.capacity}` : ""}</TableCell>
                <TableCell>{new Date(item.eventDate).toLocaleString()}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => {
                    setActiveLang("en");
                    setError("");
                    setEditing(editableEvent(item));
                  }}>Edit</Button>
                  <Button size="small" color="error" onClick={() => void remove(item)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>No events for this mosque yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} maxWidth="md" fullWidth>
        <DialogTitle>{editing?.id ? "Edit event" : "Create event"}</DialogTitle>
        <DialogContent>
          {editing && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button component="label" variant="outlined" disabled={uploading} sx={{ minWidth: 180 }}>
                  {uploading ? "Uploading..." : editing.image ? "Change image" : "Upload image"}
                  <input hidden type="file" accept="image/*" onChange={(event) => void selectImage(event)} />
                </Button>
                {editing.image && <Avatar src={editing.image} variant="rounded" sx={{ width: 72, height: 72 }} />}
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" value={editing.status} onChange={(event) => patch({ status: event.target.value as EventItem["status"] })}>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="published">Published</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              {editing.id && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography color="text.secondary">Attendees</Typography>
                  <Typography variant="h4">{editing.attendeeCount}{editing.capacity ? ` / ${editing.capacity}` : ""}</Typography>
                </Paper>
              )}

              <Tabs value={activeLang} onChange={(_event, value: Lang) => setActiveLang(value)}>
                {languages.map((language) => <Tab key={language.value} value={language.value} label={language.label} />)}
              </Tabs>
              <TextField
                label={`Title (${activeLang.toUpperCase()})`}
                value={editing.title[activeLang]}
                onChange={(event) => patch({ title: { ...editing.title, [activeLang]: event.target.value } })}
                required
              />
              <RichTextHtmlEditor
                label={`Description (${activeLang.toUpperCase()})`}
                value={editing.descriptionHtml[activeLang]}
                onChange={(descriptionHtml) => patch({ descriptionHtml: { ...editing.descriptionHtml, [activeLang]: descriptionHtml } })}
              />

              <FormControl fullWidth>
                <InputLabel>Audience mosques</InputLabel>
                <Select
                  multiple
                  label="Audience mosques"
                  value={editing.mosqueIds}
                  onChange={(event) => patch({ mosqueIds: typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value })}
                  renderValue={(selected) => selected.map((id) => mosqueNames.get(id) ?? id).join(", ")}
                >
                  {mosques.map((mosque) => (
                    <MenuItem key={mosque.id} value={mosque.id}>
                      <Checkbox checked={editing.mosqueIds.includes(mosque.id)} />
                      <ListItemText primary={mosque.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Event location</FormLabel>
                <RadioGroup row value={editing.locationType} onChange={(event) => {
                  const locationType = event.target.value as EventItem["locationType"];
                  patch({ locationType, locationMosqueId: locationType === "mosque" ? editing.locationMosqueId || mosqueId : editing.locationMosqueId });
                }}>
                  <FormControlLabel value="mosque" control={<Radio />} label="Inside a mosque" />
                  <FormControlLabel value="outside" control={<Radio />} label="Outside a mosque" />
                </RadioGroup>
              </FormControl>
              {editing.locationType === "mosque" ? (
                <FormControl fullWidth>
                  <InputLabel>Event mosque</InputLabel>
                  <Select label="Event mosque" value={editing.locationMosqueId} onChange={(event) => patch({ locationMosqueId: event.target.value })}>
                    {mosques.map((mosque) => <MenuItem key={mosque.id} value={mosque.id}>{mosque.name}</MenuItem>)}
                  </Select>
                </FormControl>
              ) : (
                <PlaceAutocomplete
                  label="Outside location"
                  value={editing.outsideLocation.address}
                  required
                  onAddressChange={(address) => patch({
                    outsideLocation: address === editing.outsideLocation.address ? editing.outsideLocation : { address }
                  })}
                  onPlaceSelect={(place: PlaceOption) => patch({ outsideLocation: { address: place.address, lat: place.lat, lng: place.lng } })}
                />
              )}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField fullWidth type="datetime-local" label="Event date" value={editing.eventDate} onChange={(event) => patch({ eventDate: event.target.value })} InputLabelProps={{ shrink: true }} required />
                <TextField fullWidth type="datetime-local" label="End date" value={editing.endDate} onChange={(event) => patch({ endDate: event.target.value })} InputLabelProps={{ shrink: true }} />
                <TextField fullWidth type="number" label="Capacity" value={editing.capacity} onChange={(event) => patch({ capacity: event.target.value })} inputProps={{ min: 1, step: 1 }} />
              </Stack>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack>
                  <FormControlLabel
                    control={<Checkbox checked={editing.registrationEnabled} onChange={(event) => patch({ registrationEnabled: event.target.checked })} />}
                    label="Show Join button in the mobile app"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={editing.isPinned} onChange={(event) => patch({ isPinned: event.target.checked })} />}
                    label="Pin this event above regular events"
                  />
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" disabled={saving || uploading} onClick={() => void save()}>{saving ? "Saving..." : "Save event"}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
