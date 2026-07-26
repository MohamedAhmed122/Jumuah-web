import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
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
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import RepeatOutlinedIcon from "@mui/icons-material/RepeatOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import { Link, useSearchParams } from "react-router-dom";
import { api, Paged } from "../api/client";

type Lang = "en" | "ru" | "lt";
type LocalizedText = Record<Lang, string>;
type Mosque = { id: string; name: string };
type Screen = "" | "main" | "community" | "settings" | "notifications";
type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
type NotificationItem = {
  id?: string;
  title: LocalizedText;
  description: LocalizedText;
  mosqueIds: string[];
  screen: Screen;
  startsAt: string;
  endsAt: string;
  isDismissLocked: boolean;
  repeatEnabled: boolean;
  repeatDays: Weekday[];
  repeatTime: string;
  timezone: string;
  isActive: boolean;
  firstSentAt?: string;
  lastSentAt?: string;
  sendCount: number;
  createdAt?: string;
};

const languages: Array<{ value: Lang; label: string }> = [
  { value: "en", label: "English" },
  { value: "ru", label: "Russian" },
  { value: "lt", label: "Lithuanian" }
];
const screenOptions: Array<{ value: Exclude<Screen, "">; label: string }> = [
  { value: "main", label: "Main Screen" },
  { value: "community", label: "Community Screen" },
  { value: "settings", label: "Settings Screen" },
  { value: "notifications", label: "Notification Screen" }
];
const weekdays: Array<{ value: Weekday; label: string }> = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" }
];

function localDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function emptyNotification(mosqueId: string): NotificationItem {
  return {
    title: { en: "", ru: "", lt: "" },
    description: { en: "", ru: "", lt: "" },
    mosqueIds: mosqueId ? [mosqueId] : [],
    screen: "",
    startsAt: "",
    endsAt: "",
    isDismissLocked: false,
    repeatEnabled: false,
    repeatDays: [],
    repeatTime: "",
    timezone: "Europe/Vilnius",
    isActive: true,
    sendCount: 0
  };
}

function localizedText(value: LocalizedText | string | undefined): LocalizedText {
  if (typeof value === "string") return { en: value, ru: "", lt: "" };
  return {
    en: value?.en ?? "",
    ru: value?.ru ?? "",
    lt: value?.lt ?? ""
  };
}

function editableNotification(item: NotificationItem): NotificationItem {
  return {
    ...item,
    title: localizedText(item.title),
    description: localizedText(item.description),
    screen: item.screen ?? "",
    startsAt: localDateTime(item.startsAt),
    endsAt: localDateTime(item.endsAt),
    repeatDays: item.repeatDays ?? [],
    repeatTime: item.repeatTime ?? ""
  };
}

export default function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [mosqueId, setMosqueId] = useState(searchParams.get("mosqueId") ?? "");
  const [rows, setRows] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<NotificationItem | null>(null);
  const [activeLang, setActiveLang] = useState<Lang>("en");
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
    const { data } = await api.get<Paged<NotificationItem>>("/api/admin/notifications", {
      params: { mosqueId, search, pageSize: 100 }
    });
    setRows(data.items);
    setTotal(data.total);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((requestError: any) => setError(requestError.response?.data?.message ?? "Notifications could not be loaded."));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [mosqueId, search]);

  function patch(value: Partial<NotificationItem>) {
    setEditing((current) => current ? { ...current, ...value } : current);
  }

  function validate(item: NotificationItem) {
    if (languages.some((language) => !item.title[language.value].trim())) return "Add the title in English, Russian and Lithuanian.";
    if (languages.some((language) => !item.description[language.value].trim())) return "Add the description in English, Russian and Lithuanian.";
    if (!item.mosqueIds.length) return "Select at least one mosque.";
    if (Boolean(item.startsAt) !== Boolean(item.endsAt)) return "The notification period requires both start and end.";
    if (item.startsAt && item.endsAt && item.endsAt <= item.startsAt) return "The period end must be after its start.";
    if (item.isDismissLocked && (!item.screen || !item.startsAt || !item.endsAt)) return "A non-dismissible message requires a screen and notification period.";
    if (item.repeatEnabled && (!item.startsAt || !item.endsAt || !item.repeatTime || !item.repeatDays.length)) {
      return "A repeating notification requires a period, delivery time and at least one weekday.";
    }
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
        screen: editing.screen || "",
        startsAt: editing.startsAt || null,
        endsAt: editing.endsAt || null,
        repeatDays: editing.repeatEnabled ? editing.repeatDays : [],
        repeatTime: editing.repeatEnabled ? editing.repeatTime : ""
      };
      if (editing.id) {
        await api.put(`/api/admin/notifications/${editing.id}`, payload);
        setMessage("Notification updated. Use Re-send to deliver it again now.");
      } else {
        const { data } = await api.post<{ recipients: number }>("/api/admin/notifications", payload);
        setMessage(editing.repeatEnabled
          ? "Repeating notification scheduled."
          : `Notification sent to ${data.recipients} registered devices.`);
      }
      setEditing(null);
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Notification could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function resend(item: NotificationItem) {
    if (!item.id || !confirm("Send this notification again now?")) return;
    setError("");
    try {
      const { data } = await api.post<{ recipients: number }>(`/api/admin/notifications/${item.id}/resend`);
      setMessage(`Notification re-sent to ${data.recipients} registered devices.`);
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Notification could not be re-sent.");
    }
  }

  return (
    <>
      <Button component={Link} to="/mosques" startIcon={<ArrowBackOutlinedIcon />} sx={{ mb: 1 }}>Back to mosques</Button>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "flex-end" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: "2rem", sm: "2.125rem" } }}>Notifications</Typography>
          <Typography color="text.secondary">{total} notifications for the selected mosque</Typography>
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
          <Button variant="contained" startIcon={<NotificationsActiveOutlinedIcon />} disabled={!mosqueId} onClick={() => {
            setActiveLang("en");
            setError("");
            setEditing(emptyNotification(mosqueId));
          }} sx={{ width: { xs: "100%", sm: "auto" } }}>Create notification</Button>
        </Stack>
      </Stack>

      {message && <Alert severity="success" onClose={() => setMessage("")} sx={{ mb: 2 }}>{message}</Alert>}
      {!editing && error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField size="small" label="Search notifications" value={search} onChange={(event) => setSearch(event.target.value)} fullWidth sx={{ maxWidth: { sm: 360 } }} />
      </Paper>

      <Paper sx={{ overflowX: "auto", width: "100%" }}>
        <Table size="small" sx={{ minWidth: 920 }}>
          <TableHead>
            <TableRow>
              <TableCell>Notification</TableCell>
              <TableCell>Mosques</TableCell>
              <TableCell>Delivery</TableCell>
              <TableCell>In-app screen</TableCell>
              <TableCell>Last sent</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.title.en || item.title.ru || item.title.lt}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.description.en || item.description.ru || item.description.lt}</Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" gap={0.5} flexWrap="wrap">
                    {item.mosqueIds.map((id) => <Chip key={id} label={mosqueNames.get(id) ?? id} size="small" />)}
                  </Stack>
                </TableCell>
                <TableCell>
                  {item.repeatEnabled ? (
                    <Chip icon={<RepeatOutlinedIcon />} label={`${item.repeatDays.map((day) => day.slice(0, 3)).join(", ")} · ${item.repeatTime}`} color="secondary" size="small" />
                  ) : <Chip label="Sent manually" size="small" />}
                </TableCell>
                <TableCell>{screenOptions.find((screen) => screen.value === item.screen)?.label ?? "Push only"}</TableCell>
                <TableCell>
                  {item.lastSentAt ? (
                    <Box>
                      <Typography variant="body2">{new Date(item.lastSentAt).toLocaleString()}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.sendCount} send{item.sendCount === 1 ? "" : "s"}</Typography>
                    </Box>
                  ) : "Not sent yet"}
                </TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => {
                    setActiveLang("en");
                    setError("");
                    setEditing(editableNotification(item));
                  }}>Edit</Button>
                  <Button size="small" startIcon={<SendOutlinedIcon />} onClick={() => void resend(item)}>Re-send</Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>No notifications for this mosque yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} maxWidth="md" fullWidth sx={{ "& .MuiDialog-paper": { m: { xs: 1, sm: 4 }, width: { xs: "calc(100% - 16px)", sm: "100%" } } }}>
        <DialogTitle>{editing?.id ? "Edit notification" : "Create notification"}</DialogTitle>
        <DialogContent>
          {editing && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <Tabs value={activeLang} onChange={(_event, value: Lang) => setActiveLang(value)} variant="scrollable" scrollButtons="auto">
                {languages.map((language) => <Tab key={language.value} value={language.value} label={language.label} />)}
              </Tabs>
              <TextField
                required
                label={`Notification title (${activeLang.toUpperCase()})`}
                value={editing.title[activeLang]}
                onChange={(event) => patch({ title: { ...editing.title, [activeLang]: event.target.value } })}
              />
              <TextField
                required
                multiline
                minRows={3}
                label={`Notification description (${activeLang.toUpperCase()})`}
                value={editing.description[activeLang]}
                onChange={(event) => patch({ description: { ...editing.description, [activeLang]: event.target.value } })}
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

              <FormControl fullWidth>
                <InputLabel>Notification screen (optional)</InputLabel>
                <Select label="Notification screen (optional)" value={editing.screen} onChange={(event) => patch({ screen: event.target.value as Screen })}>
                  <MenuItem value="">Push notification only</MenuItem>
                  {screenOptions.map((screen) => <MenuItem key={screen.value} value={screen.value}>{screen.label}</MenuItem>)}
                </Select>
              </FormControl>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Notification period (optional)</Typography>
                <Typography variant="caption" color="text.secondary">Controls how long an in-app message is visible and bounds any repeating schedule.</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
                  <TextField fullWidth type="datetime-local" label="Starts" value={editing.startsAt} onChange={(event) => patch({ startsAt: event.target.value })} InputLabelProps={{ shrink: true }} />
                  <TextField fullWidth type="datetime-local" label="Ends" value={editing.endsAt} onChange={(event) => patch({ endsAt: event.target.value })} InputLabelProps={{ shrink: true }} />
                </Stack>
                <FormControlLabel
                  sx={{ mt: 1 }}
                  control={<Checkbox checked={editing.isDismissLocked} onChange={(event) => patch({ isDismissLocked: event.target.checked })} />}
                  label="User cannot close the in-app message until the period ends"
                />
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <FormControlLabel
                  control={<Checkbox checked={editing.repeatEnabled} onChange={(event) => patch({
                    repeatEnabled: event.target.checked,
                    repeatDays: event.target.checked ? editing.repeatDays : [],
                    repeatTime: event.target.checked ? editing.repeatTime : ""
                  })} />}
                  label="Repeat this notification"
                />
                {editing.repeatEnabled && (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1.5 }}>
                    <FormControl fullWidth>
                      <InputLabel>Weekdays</InputLabel>
                      <Select
                        multiple
                        label="Weekdays"
                        value={editing.repeatDays}
                        onChange={(event) => patch({ repeatDays: (typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value) as Weekday[] })}
                        renderValue={(selected) => selected.map((day) => weekdays.find((option) => option.value === day)?.label ?? day).join(", ")}
                      >
                        {weekdays.map((day) => (
                          <MenuItem key={day.value} value={day.value}>
                            <Checkbox checked={editing.repeatDays.includes(day.value)} />
                            <ListItemText primary={day.label} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      type="time"
                      label="Delivery time"
                      value={editing.repeatTime}
                      onChange={(event) => patch({ repeatTime: event.target.value })}
                      InputLabelProps={{ shrink: true }}
                      helperText="Europe/Vilnius time"
                    />
                  </Stack>
                )}
              </Paper>

              <FormControlLabel
                control={<Checkbox checked={editing.isActive} onChange={(event) => patch({ isActive: event.target.checked })} />}
                label="Active"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column-reverse", sm: "row" }, alignItems: { xs: "stretch", sm: "center" }, px: { xs: 2, sm: 3 } }}>
          <Button disabled={saving} onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : editing?.id ? "Save changes" : editing?.repeatEnabled ? "Create schedule" : "Create and send"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
