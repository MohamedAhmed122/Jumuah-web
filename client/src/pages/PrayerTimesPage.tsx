import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  FormControl,
  Grid,
  InputLabel,
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
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DateRangeOutlinedIcon from "@mui/icons-material/DateRangeOutlined";
import TableRowsOutlinedIcon from "@mui/icons-material/TableRowsOutlined";
import { readSheet } from "read-excel-file/browser";
import { Link, useSearchParams } from "react-router-dom";
import { api, Paged } from "../api/client";

type Mosque = { id: string; name: string };
type PrayerTimes = { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string };
type PrayerKey = keyof PrayerTimes;
type PrayerTime = { id?: string; mosqueId: string; date: string; times: PrayerTimes };
type ViewMode = "bulk" | "upload" | "calendar";
type SpreadsheetCell = string | number | boolean | Date | null | undefined;

const emptyTimes: PrayerTimes = { fajr: "", dhuhr: "", asr: "", maghrib: "", isha: "" };
const prayerKeys = Object.keys(emptyTimes) as PrayerKey[];
const prayerLabels: Record<PrayerKey, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha"
};
const timePattern = /^(([01]\d|2[0-3]):[0-5]\d|--:--)$/;
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateRange(from: string, to: string) {
  if (!from || !to || from > to) return [];
  const dates: string[] = [];
  const current = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00.000Z`));
}

function validatePrayerItem(item: PrayerTime) {
  const errors: Record<string, string> = {};
  if (!item.date) errors.date = "Date is required";
  for (const key of prayerKeys) {
    if (!item.times[key]) errors[key] = "Required";
    else if (!timePattern.test(item.times[key])) errors[key] = "Use HH:mm";
  }
  return errors;
}

function hasAnyTime(times?: PrayerTimes) {
  return Boolean(times && prayerKeys.some((key) => times[key]));
}

function monthBounds(month: string) {
  const first = new Date(`${month}T00:00:00.000Z`);
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

function moveMonth(month: string, amount: number) {
  const date = new Date(`${month}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + amount, 1);
  return date.toISOString().slice(0, 8) + "01";
}

function calendarCells(month: string) {
  const { from, to } = monthBounds(month);
  const firstWeekday = (new Date(`${from}T00:00:00.000Z`).getUTCDay() + 6) % 7;
  const dates = dateRange(from, to);
  const cells: Array<string | null> = [...Array(firstWeekday).fill(null), ...dates];
  while (cells.length % 7) cells.push(null);
  return cells;
}

function detectDelimiter(text: string) {
  const sample = text.split(/\r?\n/).slice(0, 12).join("\n");
  return [",", ";", "\t"].sort((a, b) => sample.split(b).length - sample.split(a).length)[0];
}

function parseDelimited(text: string) {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(value: SpreadsheetCell) {
  return String(value ?? "").replace(/^\uFEFF/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeDate(value: SpreadsheetCell) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const trimmed = String(value ?? "").trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const european = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (european) return `${european[3]}-${european[2].padStart(2, "0")}-${european[1].padStart(2, "0")}`;
  const serial = Number(trimmed);
  if (Number.isFinite(serial) && serial > 20_000 && serial < 80_000) {
    return new Date(Date.UTC(1899, 11, 30 + serial)).toISOString().slice(0, 10);
  }
  return "";
}

function normalizeTime(value: SpreadsheetCell) {
  if (value instanceof Date) {
    return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
  }
  const trimmed = String(value ?? "").trim();
  if (/^--:--(?::--)?$/.test(trimmed)) return "--:--";
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
  const fraction = Number(trimmed);
  if (Number.isFinite(fraction) && fraction >= 0 && fraction < 1) {
    const minutes = Math.round(fraction * 24 * 60) % (24 * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }
  return trimmed;
}

export function prayerItemsFromRows(rows: SpreadsheetCell[][], mosqueId: string) {
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeHeader);
    return ["date", "fajr", "maghrib", "isha"].every((header) => headers.includes(header));
  });
  if (headerIndex < 0) throw new Error("Could not find a header row with Date, Fajr, Maghrib and Isha.");

  const headers = rows[headerIndex].map(normalizeHeader);
  const indexOf = (...aliases: string[]) => aliases.map((alias) => headers.indexOf(alias)).find((index) => index >= 0) ?? -1;
  const indexes = {
    date: indexOf("date"),
    fajr: indexOf("fajr"),
    dhuhr: indexOf("dhuhr", "duhr", "zuhr"),
    asr: indexOf("asr1", "asr"),
    maghrib: indexOf("maghrib"),
    isha: indexOf("isha")
  };
  if (Object.values(indexes).some((index) => index < 0)) {
    throw new Error("The spreadsheet must include Date, Fajr, Dhuhr, Asr or Asr 1, Maghrib and Isha columns.");
  }

  const items = rows.slice(headerIndex + 1).map((row) => ({
    mosqueId,
    date: normalizeDate(row[indexes.date]),
    times: {
      fajr: normalizeTime(row[indexes.fajr]),
      dhuhr: normalizeTime(row[indexes.dhuhr]),
      asr: normalizeTime(row[indexes.asr]),
      maghrib: normalizeTime(row[indexes.maghrib]),
      isha: normalizeTime(row[indexes.isha])
    }
  })).filter((item) => item.date || hasAnyTime(item.times));

  const invalidRows = items
    .map((item, index) => ({ row: headerIndex + index + 2, errors: validatePrayerItem(item) }))
    .filter(({ errors }) => Object.keys(errors).length > 0);
  if (invalidRows.length) {
    throw new Error(`Found invalid prayer data on row${invalidRows.length > 1 ? "s" : ""} ${invalidRows.slice(0, 5).map(({ row }) => row).join(", ")}.`);
  }
  if (!items.length) throw new Error("The spreadsheet does not contain any prayer-time rows.");
  return items;
}

export default function PrayerTimesPage() {
  const [searchParams] = useSearchParams();
  const today = new Date().toISOString().slice(0, 10);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [mosqueId, setMosqueId] = useState(searchParams.get("mosqueId") ?? "");
  const [view, setView] = useState<ViewMode>("bulk");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [calendarMonth, setCalendarMonth] = useState(`${today.slice(0, 7)}-01`);
  const [selectedDate, setSelectedDate] = useState(today);
  const [rows, setRows] = useState<PrayerTime[]>([]);
  const [bulkTimes, setBulkTimes] = useState<Record<string, PrayerTimes>>({});
  const [bulkErrors, setBulkErrors] = useState<Record<string, Record<string, string>>>({});
  const [calendarTimes, setCalendarTimes] = useState<PrayerTimes>({ ...emptyTimes });
  const [calendarErrors, setCalendarErrors] = useState<Record<string, string>>({});
  const [uploadItems, setUploadItems] = useState<PrayerTime[]>([]);
  const [uploadFileName, setUploadFileName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const bulkDates = useMemo(() => dateRange(from, to), [from, to]);
  const calendarRange = useMemo(() => monthBounds(calendarMonth), [calendarMonth]);
  const visibleRange = view === "calendar" ? calendarRange : { from, to };
  const params = useMemo(
    () => ({ mosqueId, from: visibleRange.from, to: visibleRange.to, pageSize: 100 }),
    [mosqueId, visibleRange.from, visibleRange.to]
  );
  const selectedRow = rows.find((row) => row.date === selectedDate);

  useEffect(() => {
    void api.get<Paged<Mosque>>("/api/admin/mosques", { params: { pageSize: 100 } }).then(({ data }) => {
      setMosques(data.items);
      if (!mosqueId && data.items[0]) setMosqueId(data.items[0].id);
    });
  }, []);

  async function load() {
    if (!mosqueId) {
      setRows([]);
      return;
    }
    const { data } = await api.get<Paged<PrayerTime>>("/api/admin/mosque-prayer-times", { params });
    setRows(data.items);
  }

  useEffect(() => {
    void load();
  }, [params]);

  useEffect(() => {
    setBulkTimes((current) => {
      const next = { ...current };
      for (const date of bulkDates) {
        const existing = rows.find((row) => row.date === date);
        next[date] = hasAnyTime(next[date]) ? next[date] : existing?.times ?? { ...emptyTimes };
      }
      return next;
    });
  }, [bulkDates, rows]);

  useEffect(() => {
    setCalendarTimes(selectedRow?.times ? { ...selectedRow.times } : { ...emptyTimes });
    setCalendarErrors({});
  }, [selectedDate, selectedRow?.id, rows]);

  function updateBulkTime(date: string, prayer: PrayerKey, value: string) {
    setBulkTimes((current) => ({
      ...current,
      [date]: { ...(current[date] ?? emptyTimes), [prayer]: value }
    }));
    setBulkErrors((current) => ({
      ...current,
      [date]: { ...(current[date] ?? {}), [prayer]: "" }
    }));
  }

  async function submitItems(items: PrayerTime[]) {
    if (!mosqueId) return;
    setError("");
    try {
      const payload = items.map(({ date, times }) => ({ date, times }));
      const { data } = await api.post(`/api/admin/mosques/${mosqueId}/prayer-times/import`, { items: payload });
      const unchanged = Number(data.unchanged ?? 0);
      setMessage(
        `Saved ${data.total} days: ${data.created} created, ${data.updated} updated${unchanged ? `, ${unchanged} unchanged` : ""}.`
      );
      try {
        await load();
      } catch (refreshError: any) {
        setError(refreshError.response?.data?.message
          ? `Prayer times were saved, but refresh failed: ${refreshError.response.data.message}`
          : "Prayer times were saved, but the page could not refresh.");
      }
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Prayer times could not be saved.");
    }
  }

  async function saveBulkRange() {
    const items = bulkDates.map((date) => ({ mosqueId, date, times: bulkTimes[date] ?? { ...emptyTimes } }));
    const nextErrors = Object.fromEntries(
      items
        .map((item) => [item.date, validatePrayerItem(item)] as const)
        .filter(([, itemErrors]) => Object.keys(itemErrors).length > 0)
    );
    setBulkErrors(nextErrors);
    if (!mosqueId || from > to || Object.keys(nextErrors).length > 0) return;
    await submitItems(items);
  }

  async function handleUploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMessage("");
    setError("");
    setUploadItems([]);
    setUploadFileName(file.name);
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx")) {
      setError("Upload a CSV or XLSX file.");
      return;
    }
    try {
      const spreadsheetRows: SpreadsheetCell[][] = fileName.endsWith(".xlsx")
        ? await readSheet(file) as unknown as SpreadsheetCell[][]
        : parseDelimited(await file.text());
      setUploadItems(prayerItemsFromRows(spreadsheetRows, mosqueId));
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "The spreadsheet could not be read.");
    }
  }

  async function saveCalendarDate() {
    const item: PrayerTime = { mosqueId, date: selectedDate, times: calendarTimes, id: selectedRow?.id };
    const nextErrors = validatePrayerItem(item);
    setCalendarErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setError("");
    try {
      if (item.id) await api.put(`/api/admin/mosque-prayer-times/${item.id}`, item);
      else await api.post("/api/admin/mosque-prayer-times", item);
      setMessage(`${formatDisplayDate(selectedDate)} prayer times saved.`);
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Prayer times could not be saved.");
    }
  }

  function chooseCalendarDate(date: string) {
    setSelectedDate(date);
    setCalendarErrors({});
  }

  function changeCalendarMonth(amount: number) {
    const nextMonth = moveMonth(calendarMonth, amount);
    setCalendarMonth(nextMonth);
    setSelectedDate(nextMonth);
    setCalendarErrors({});
  }

  return (
    <>
      <Button component={Link} to="/mosques" startIcon={<ArrowBackOutlinedIcon />} sx={{ mb: 1 }}>
        Back to mosques
      </Button>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "flex-end" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Mosque Prayer Times</Typography>
          <Typography color="text.secondary">Add, import and review the five daily prayer times.</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 280 } }}>
          <InputLabel>Mosque</InputLabel>
          <Select
            label="Mosque"
            value={mosqueId}
            onChange={(event) => {
              setMosqueId(event.target.value);
              setMessage("");
              setError("");
            }}
          >
            {mosques.map((mosque) => <MenuItem key={mosque.id} value={mosque.id}>{mosque.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      {message && <Alert severity="success" onClose={() => setMessage("")} sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ mb: 2, overflow: "hidden" }}>
        <Tabs
          value={view}
          onChange={(_event, value: ViewMode) => {
            setView(value);
            setMessage("");
            setError("");
          }}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Prayer time management options"
          sx={{ px: 1, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab icon={<TableRowsOutlinedIcon />} iconPosition="start" value="bulk" label="Bulk add" />
          <Tab icon={<CloudUploadOutlinedIcon />} iconPosition="start" value="upload" label="Upload CSV / XLSX" />
          <Tab icon={<CalendarMonthOutlinedIcon />} iconPosition="start" value="calendar" label="Calendar" />
        </Tabs>
      </Paper>

      {view === "bulk" && (
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Bulk Add Prayer Times</Typography>
              <Typography color="text.secondary" variant="body2">Create or update one section for every date in the range.</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField size="small" label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField size="small" label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} InputLabelProps={{ shrink: true }} />
              <Button variant="contained" disabled={!mosqueId || bulkDates.length === 0} onClick={() => void saveBulkRange()}>Save range</Button>
            </Stack>
          </Stack>
          {from > to && <Alert severity="error" sx={{ mb: 2 }}>From date must be before or equal to To date.</Alert>}
          <Stack spacing={2}>
            {bulkDates.map((date) => (
              <Box key={date} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>{formatDisplayDate(date)}</Typography>
                <Grid container spacing={1.5}>
                  {prayerKeys.map((key) => (
                    <Grid item xs={12} sm={6} md={2.4} key={key}>
                      <TextField
                        fullWidth
                        size="small"
                        label={prayerLabels[key]}
                        placeholder="HH:mm"
                        value={bulkTimes[date]?.[key] ?? ""}
                        onChange={(event) => updateBulkTime(date, key, event.target.value)}
                        error={Boolean(bulkErrors[date]?.[key])}
                        helperText={bulkErrors[date]?.[key] ?? " "}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {view === "upload" && (
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Upload prayer times</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5, mb: 2.5 }}>
                  Import one month, several months or a full year. Existing dates will be updated.
                </Typography>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUploadOutlinedIcon />}
                  disabled={!mosqueId}
                  sx={{ minHeight: 112, width: "100%", borderStyle: "dashed", borderWidth: 2 }}
                >
                  Choose CSV or XLSX file
                  <input
                    hidden
                    type="file"
                    accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) => void handleUploadFile(event)}
                  />
                </Button>
                {uploadFileName && <Chip label={uploadFileName} size="small" sx={{ mt: 1.5, maxWidth: "100%" }} />}
                <Box sx={{ bgcolor: "action.hover", borderRadius: 1.5, p: 2, mt: 2 }}>
                  <Typography variant="subtitle2">Required columns</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Date, Fajr, Dhuhr, Asr or Asr 1, Maghrib, Isha
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    Extra columns such as Day, Hijri, Sunrise and Asr 2 are ignored. Times may use HH:mm or HH:mm:ss.
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={7}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Import preview</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {uploadItems.length ? `${uploadItems.length} valid days found` : "Choose a file to preview its prayer times"}
                  </Typography>
                </Box>
                <Button variant="contained" disabled={!uploadItems.length} onClick={() => void submitItems(uploadItems)}>Import {uploadItems.length || ""}</Button>
              </Stack>
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, minHeight: 250, overflowX: "auto" }}>
                {uploadItems.length ? (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {["Date", "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].map((heading) => <TableCell key={heading}>{heading}</TableCell>)}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {uploadItems.slice(0, 12).map((item) => (
                        <TableRow key={item.date}>
                          <TableCell>{item.date}</TableCell>
                          {prayerKeys.map((key) => <TableCell key={key}>{item.times[key]}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 250, color: "text.secondary" }}>
                    <DateRangeOutlinedIcon sx={{ fontSize: 42, mb: 1, opacity: 0.5 }} />
                    <Typography variant="body2">No spreadsheet selected</Typography>
                  </Stack>
                )}
              </Box>
              {uploadItems.length > 12 && <Typography variant="caption" color="text.secondary">Showing the first 12 days.</Typography>}
            </Grid>
          </Grid>
        </Paper>
      )}

      {view === "calendar" && (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Button size="small" aria-label="Previous month" onClick={() => changeCalendarMonth(-1)}>
                  <ChevronLeftOutlinedIcon />
                </Button>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${calendarMonth}T00:00:00.000Z`))}
                </Typography>
                <Button size="small" aria-label="Next month" onClick={() => changeCalendarMonth(1)}>
                  <ChevronRightOutlinedIcon />
                </Button>
              </Stack>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: { xs: 0.5, sm: 1 } }}>
                {weekDays.map((day) => (
                  <Typography key={day} variant="caption" color="text.secondary" align="center" sx={{ fontWeight: 700, py: 0.5 }}>{day}</Typography>
                ))}
                {calendarCells(calendarMonth).map((date, index) => {
                  if (!date) return <Box key={`blank-${index}`} sx={{ minHeight: { xs: 48, sm: 74 } }} />;
                  const hasTimes = rows.some((row) => row.date === date);
                  const selected = date === selectedDate;
                  return (
                    <ButtonBase
                      key={date}
                      onClick={() => chooseCalendarDate(date)}
                      aria-label={`Select ${formatDisplayDate(date)}`}
                      sx={{
                        alignItems: "flex-start",
                        bgcolor: selected ? "primary.main" : "transparent",
                        border: 1,
                        borderColor: selected ? "primary.main" : "divider",
                        borderRadius: 1.5,
                        color: selected ? "primary.contrastText" : "text.primary",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        minHeight: { xs: 48, sm: 74 },
                        p: { xs: 0.75, sm: 1.25 },
                        transition: "background-color 120ms ease, border-color 120ms ease",
                        "&:hover": { bgcolor: selected ? "primary.dark" : "action.hover" }
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{Number(date.slice(-2))}</Typography>
                      {hasTimes && <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: selected ? "secondary.light" : "secondary.main" }} />}
                    </ButtonBase>
                  );
                })}
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2.5, position: { lg: "sticky" }, top: { lg: 88 } }}>
              <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700 }}>Selected day</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{formatDisplayDate(selectedDate)}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedRow ? "Update one time or all five, then save." : "Add all five prayer times for this day."}
              </Typography>
              <Stack spacing={1.5}>
                {prayerKeys.map((key) => (
                  <TextField
                    key={key}
                    size="small"
                    label={prayerLabels[key]}
                    placeholder="HH:mm"
                    value={calendarTimes[key]}
                    onChange={(event) => {
                      setCalendarTimes((current) => ({ ...current, [key]: event.target.value }));
                      setCalendarErrors((current) => ({ ...current, [key]: "" }));
                    }}
                    error={Boolean(calendarErrors[key])}
                    helperText={calendarErrors[key]}
                  />
                ))}
                <Button variant="contained" disabled={!mosqueId} onClick={() => void saveCalendarDate()}>
                  Save prayer times
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}
    </>
  );
}
