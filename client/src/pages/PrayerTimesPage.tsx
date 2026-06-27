import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { api, Paged } from "../api/client";

type Mosque = { id: string; name: string };
type PrayerTime = {
  id?: string;
  mosqueId: string;
  date: string;
  times: { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string };
};

const emptyTimes = { fajr: "", dhuhr: "", asr: "", maghrib: "", isha: "" };
const prayerKeys = Object.keys(emptyTimes) as Array<keyof typeof emptyTimes>;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

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
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
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

function hasAnyTime(times?: PrayerTime["times"]) {
  return Boolean(times && prayerKeys.some((key) => times[key]));
}

export default function PrayerTimesPage() {
  const [searchParams] = useSearchParams();
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [mosqueId, setMosqueId] = useState(searchParams.get("mosqueId") ?? "");
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<PrayerTime[]>([]);
  const [editing, setEditing] = useState<PrayerTime | null>(null);
  const [bulkTimes, setBulkTimes] = useState<Record<string, PrayerTime["times"]>>({});
  const [bulkErrors, setBulkErrors] = useState<Record<string, Record<string, string>>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const params = useMemo(() => ({ mosqueId, from, to, pageSize: 100 }), [mosqueId, from, to]);
  const bulkDates = useMemo(() => dateRange(from, to), [from, to]);

  useEffect(() => {
    void api.get<Paged<Mosque>>("/api/admin/mosques", { params: { pageSize: 100 } }).then(({ data }) => {
      setMosques(data.items);
      if (!mosqueId && data.items[0]) setMosqueId(data.items[0].id);
    });
  }, []);

  async function load() {
    if (!mosqueId) return;
    const { data } = await api.get<Paged<PrayerTime>>("/api/admin/mosque-prayer-times", { params });
    setRows(data.items);
  }

  useEffect(() => {
    void load();
  }, [params]);

  async function save() {
    if (!editing) return;
    const errors = validatePrayerItem(editing);
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (editing.id) await api.put(`/api/admin/mosque-prayer-times/${editing.id}`, editing);
    else await api.post("/api/admin/mosque-prayer-times", editing);
    setEditing(null);
    await load();
  }

  async function remove(row: PrayerTime) {
    if (!row.id || !confirm("Delete this prayer-time record?")) return;
    await api.delete(`/api/admin/mosque-prayer-times/${row.id}`);
    await load();
  }

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

  function updateBulkTime(date: string, prayer: keyof typeof emptyTimes, value: string) {
    setBulkTimes((current) => ({
      ...current,
      [date]: { ...(current[date] ?? emptyTimes), [prayer]: value }
    }));
    setBulkErrors((current) => ({
      ...current,
      [date]: { ...(current[date] ?? {}), [prayer]: "" }
    }));
  }

  async function importItems() {
    const items = bulkDates.map((date) => ({
      date,
      times: bulkTimes[date] ?? { ...emptyTimes }
    }));
    const nextErrors = Object.fromEntries(
      items
        .map((item) => [item.date, validatePrayerItem({ mosqueId, ...item })] as const)
        .filter(([, errors]) => Object.keys(errors).length > 0)
    );
    setBulkErrors(nextErrors);
    if (!mosqueId || from > to || Object.keys(nextErrors).length > 0) return;
    const { data } = await api.post(`/api/admin/mosques/${mosqueId}/prayer-times/import`, { items });
    setMessage(`Imported ${data.total}: ${data.created} created, ${data.updated} updated`);
    await load();
  }

  return (
    <>
      <Typography variant="h4" sx={{ mb: 1 }}>Mosque Prayer Times</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Mobile app uses these API times when present, otherwise falls back to local calculation.
      </Typography>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <FormControl sx={{ minWidth: 240 }}>
            <InputLabel>Mosque</InputLabel>
            <Select label="Mosque" value={mosqueId} onChange={(event) => setMosqueId(event.target.value)}>
              {mosques.map((mosque) => <MenuItem key={mosque.id} value={mosque.id}>{mosque.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="contained" onClick={() => {
            setEditErrors({});
            setEditing({ mosqueId, date: from, times: { ...emptyTimes } });
          }}>Add Date</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6">Bulk Add Prayer Times</Typography>
            <Typography color="text.secondary" variant="body2">One section is created for every date in the selected range.</Typography>
          </Box>
          <Button variant="contained" disabled={!mosqueId || bulkDates.length === 0} onClick={() => void importItems()}>Save Range</Button>
        </Stack>
        {from > to && <Alert severity="error" sx={{ mb: 2 }}>From date must be before or equal to To date.</Alert>}
        <Stack spacing={2}>
          {bulkDates.map((date) => (
            <Box key={date} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1.5 }}>{formatDisplayDate(date)}</Typography>
              <Grid container spacing={1.5}>
                {prayerKeys.map((key) => (
                  <Grid item xs={12} sm={6} md={2.4} key={key}>
                    <TextField
                      fullWidth
                      label={key}
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

      <Paper sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Date", "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha", "Actions"].map((head) => <TableCell key={head}>{head}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.times.fajr}</TableCell>
                <TableCell>{row.times.dhuhr}</TableCell>
                <TableCell>{row.times.asr}</TableCell>
                <TableCell>{row.times.maghrib}</TableCell>
                <TableCell>{row.times.isha}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => {
                    setEditErrors({});
                    setEditing(row);
                  }}>Edit</Button>
                  <Button size="small" color="error" onClick={() => void remove(row)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?.id ? "Edit" : "Create"} Prayer Times</DialogTitle>
        <DialogContent>
          {editing && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Date" type="date" value={editing.date} onChange={(event) => setEditing({ ...editing, date: event.target.value })} InputLabelProps={{ shrink: true }} />
              {prayerKeys.map((key) => (
                <TextField
                  key={key}
                  label={key}
                  value={editing.times[key]}
                  onChange={(event) => setEditing({ ...editing, times: { ...editing.times, [key]: event.target.value } })}
                  placeholder="HH:mm"
                  error={Boolean(editErrors[key])}
                  helperText={editErrors[key] ?? " "}
                />
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditErrors({});
            setEditing(null);
          }}>Cancel</Button>
          <Button variant="contained" onClick={() => void save()}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
