import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
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
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import { Link, useSearchParams } from "react-router-dom";
import { api, Paged, uploadImage } from "../api/client";
import PlaceAutocomplete, { PlaceOption } from "../components/PlaceAutocomplete";
import RichTextHtmlEditor from "../components/RichTextHtmlEditor";

type Lang = "en" | "ru" | "lt";
type LocalizedText = Record<Lang, string>;
type Mosque = { id: string; name: string; address?: string };
type OutsideLocation = { address: string; lat?: number; lng?: number };
type Announcement = {
  id?: string;
  title: LocalizedText;
  descriptionHtml: LocalizedText;
  image: string;
  mosqueIds: string[];
  status: "draft" | "published";
  date: string;
  eventDate: string;
  endDate: string;
  locationType: "mosque" | "outside";
  locationMosqueId: string;
  outsideLocation: OutsideLocation;
  sendPushOnPublish: boolean;
  hideAfterEndDate: boolean;
  deleteAfterEndDate: boolean;
  isPinned: boolean;
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

function emptyAnnouncement(mosqueId: string, eventDate = ""): Announcement {
  return {
    title: { en: "", ru: "", lt: "" },
    descriptionHtml: { en: "<p></p>", ru: "<p></p>", lt: "<p></p>" },
    image: "",
    mosqueIds: mosqueId ? [mosqueId] : [],
    status: "draft",
    date: localDateTime(),
    eventDate,
    endDate: "",
    locationType: "mosque",
    locationMosqueId: mosqueId,
    outsideLocation: { address: "" },
    sendPushOnPublish: false,
    hideAfterEndDate: false,
    deleteAfterEndDate: false,
    isPinned: false
  };
}

function localizedText(value: LocalizedText | string | undefined, fallback = ""): LocalizedText {
  if (typeof value === "string") return { en: value, ru: fallback, lt: fallback };
  return {
    en: value?.en ?? fallback,
    ru: value?.ru ?? fallback,
    lt: value?.lt ?? fallback
  };
}

function editableAnnouncement(item: Announcement): Announcement {
  return {
    ...item,
    title: localizedText(item.title),
    descriptionHtml: localizedText(item.descriptionHtml, "<p></p>"),
    date: localDateTime(item.date),
    eventDate: item.eventDate ? localDateTime(item.eventDate) : "",
    endDate: item.endDate ? localDateTime(item.endDate) : "",
    outsideLocation: item.outsideLocation ?? { address: "" },
    locationMosqueId: item.locationMosqueId ?? ""
  };
}

function hasText(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0;
}

export default function AnnouncementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [mosqueId, setMosqueId] = useState(searchParams.get("mosqueId") ?? "");
  const [rows, setRows] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [activeLang, setActiveLang] = useState<Lang>("en");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const createHandled = useRef(false);

  const mosqueNames = useMemo(() => new Map(mosques.map((mosque) => [mosque.id, mosque.name])), [mosques]);

  useEffect(() => {
    void api.get<Paged<Mosque>>("/api/admin/mosques", { params: { pageSize: 100 } })
      .then(({ data }) => {
        setMosques(data.items);
        if (!mosqueId && data.items[0]) {
          setMosqueId(data.items[0].id);
          setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set("mosqueId", data.items[0].id);
            return next;
          }, { replace: true });
        }
      })
      .catch((requestError: any) => setError(requestError.response?.data?.message ?? "Mosques could not be loaded."));
  }, []);

  async function load() {
    if (!mosqueId) return;
    const { data } = await api.get<Paged<Announcement>>("/api/admin/announcements", {
      params: { mosqueId, search, status: status || undefined, pageSize: 100 }
    });
    setRows(data.items);
    setTotal(data.total);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((requestError: any) => setError(requestError.response?.data?.message ?? "Announcements could not be loaded."));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [mosqueId, search, status]);

  function openCreate() {
    setActiveLang("en");
    setError("");
    setEditing(emptyAnnouncement(mosqueId, searchParams.get("eventDate") ?? ""));
  }

  useEffect(() => {
    if (createHandled.current || searchParams.get("create") !== "1" || !mosqueId) return;
    createHandled.current = true;
    openCreate();
  }, [mosqueId, searchParams]);

  function validate(item: Announcement) {
    if (!item.mosqueIds.length) return "Select at least one audience mosque.";
    if (!item.image) return "Upload an announcement image.";
    if (languages.some((language) => !item.title[language.value].trim())) return "Add the title in English, Russian and Lithuanian.";
    if (languages.some((language) => !hasText(item.descriptionHtml[language.value]))) return "Add the description in English, Russian and Lithuanian.";
    if (!item.date) return "Announcement date is required.";
    if (item.locationType === "mosque" && !item.locationMosqueId) return "Select the event mosque.";
    if (item.locationType === "outside" && (!item.outsideLocation.address || !Number.isFinite(item.outsideLocation.lat) || !Number.isFinite(item.outsideLocation.lng))) {
      return "Select an outside address from autocomplete.";
    }
    if ((item.hideAfterEndDate || item.deleteAfterEndDate) && !item.endDate) return "End date is required for automatic expiry.";
    if (item.eventDate && item.endDate && item.endDate < item.eventDate) return "End date must be after the event date.";
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
        eventDate: editing.eventDate || null,
        endDate: editing.endDate || null,
        locationMosqueId: editing.locationType === "mosque" ? editing.locationMosqueId : "",
        outsideLocation: editing.locationType === "outside" ? editing.outsideLocation : null
      };
      if (editing.id) await api.put(`/api/admin/announcements/${editing.id}`, payload);
      else await api.post("/api/admin/announcements", payload);
      setEditing(null);
      setMessage(editing.id ? "Announcement updated." : "Announcement created.");
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Announcement could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Announcement) {
    if (!item.id || !confirm("Delete this announcement permanently?")) return;
    await api.delete(`/api/admin/announcements/${item.id}`);
    setMessage("Announcement deleted.");
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

  function patch(patchValue: Partial<Announcement>) {
    setEditing((current) => current ? { ...current, ...patchValue } : current);
  }

  return (
    <>
      <Button component={Link} to="/mosques" startIcon={<ArrowBackOutlinedIcon />} sx={{ mb: 1 }}>Back to mosques</Button>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "flex-end" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Announcements</Typography>
          <Typography color="text.secondary">{total} announcements for the selected mosque</Typography>
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
          <Button variant="contained" startIcon={<CampaignOutlinedIcon />} disabled={!mosqueId} onClick={openCreate}>Create announcement</Button>
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
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Paper sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Announcement</TableCell>
              <TableCell>Audience</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Event</TableCell>
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
                      <Typography variant="caption" color="text.secondary">{new Date(item.date).toLocaleString()}</Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" gap={0.5} flexWrap="wrap">
                    {item.mosqueIds.map((id) => <Chip key={id} label={mosqueNames.get(id) ?? id} size="small" />)}
                  </Stack>
                </TableCell>
                <TableCell>{item.locationType === "mosque" ? mosqueNames.get(item.locationMosqueId) ?? "Mosque" : item.outsideLocation?.address ?? "Outside"}</TableCell>
                <TableCell><Chip label={item.status} color={item.status === "published" ? "success" : "default"} size="small" /></TableCell>
                <TableCell>{item.eventDate ? new Date(item.eventDate).toLocaleString() : "-"}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => {
                    setActiveLang("en");
                    setError("");
                    setEditing(editableAnnouncement(item));
                  }}>Edit</Button>
                  <Button size="small" color="error" onClick={() => void remove(item)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>No announcements for this mosque yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} maxWidth="md" fullWidth>
        <DialogTitle>{editing?.id ? "Edit announcement" : "Create announcement"}</DialogTitle>
        <DialogContent>
          {editing && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button component="label" variant="outlined" disabled={uploading} sx={{ minWidth: 180 }}>
                  {uploading ? "Uploading…" : editing.image ? "Change image" : "Upload image"}
                  <input hidden type="file" accept="image/*" onChange={(event) => void selectImage(event)} />
                </Button>
                {editing.image && <Avatar src={editing.image} variant="rounded" sx={{ width: 72, height: 72 }} />}
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" value={editing.status} onChange={(event) => patch({ status: event.target.value as Announcement["status"] })}>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="published">Published</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

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
                  const locationType = event.target.value as Announcement["locationType"];
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
                <TextField fullWidth type="datetime-local" label="Announcement date" value={editing.date} onChange={(event) => patch({ date: event.target.value })} InputLabelProps={{ shrink: true }} required />
                <TextField fullWidth type="datetime-local" label="Event date" value={editing.eventDate} onChange={(event) => patch({ eventDate: event.target.value })} InputLabelProps={{ shrink: true }} />
                <TextField fullWidth type="datetime-local" label="End date" value={editing.endDate} onChange={(event) => patch({ endDate: event.target.value })} InputLabelProps={{ shrink: true }} />
              </Stack>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack>
                  <FormControlLabel
                    control={<Checkbox checked={editing.sendPushOnPublish} onChange={(event) => patch({ sendPushOnPublish: event.target.checked })} />}
                    label="Send a push notification when published"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={editing.isPinned} onChange={(event) => patch({ isPinned: event.target.checked })} />}
                    label="Pin this announcement above regular announcements"
                  />
                  <FormControlLabel
                    disabled={editing.deleteAfterEndDate}
                    control={<Checkbox checked={editing.hideAfterEndDate} onChange={(event) => patch({ hideAfterEndDate: event.target.checked })} />}
                    label="Hide this announcement after the end date"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={editing.deleteAfterEndDate} onChange={(event) => patch({ deleteAfterEndDate: event.target.checked, hideAfterEndDate: event.target.checked ? false : editing.hideAfterEndDate })} />}
                    label="Permanently delete this announcement after the end date"
                  />
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" disabled={saving || uploading} onClick={() => void save()}>{saving ? "Saving…" : "Save announcement"}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
