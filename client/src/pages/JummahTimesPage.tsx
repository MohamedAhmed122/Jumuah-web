import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import { Link, useSearchParams } from "react-router-dom";
import { api, Paged } from "../api/client";

type Mosque = { id: string; name: string };
type JummahSchedule = {
  allFridays: boolean;
  startDate?: string;
  endDate?: string;
  times: string[];
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const serviceNames = ["First Jummah", "Second Jummah", "Third Jummah"];

export default function JummahTimesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [mosqueId, setMosqueId] = useState(searchParams.get("mosqueId") ?? "");
  const [allFridays, setAllFridays] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [times, setTimes] = useState([""]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [hasSavedSchedule, setHasSavedSchedule] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  useEffect(() => {
    if (!mosqueId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage("");
    setError("");
    setFieldErrors({});
    void api.get<{ jummahSchedule: JummahSchedule | null }>(`/api/admin/mosques/${mosqueId}/jummah-times`)
      .then(({ data }) => {
        const schedule = data.jummahSchedule;
        setAllFridays(schedule?.allFridays ?? true);
        setStartDate(schedule?.startDate ?? "");
        setEndDate(schedule?.endDate ?? "");
        setTimes(schedule?.times?.length ? schedule.times : [""]);
        setHasSavedSchedule(Boolean(schedule));
      })
      .catch((requestError: any) => setError(requestError.response?.data?.message ?? "Jummah times could not be loaded."))
      .finally(() => setLoading(false));
  }, [mosqueId]);

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!allFridays) {
      if (!startDate) nextErrors.startDate = "Required";
      if (!endDate) nextErrors.endDate = "Required";
      if (startDate && endDate && startDate > endDate) nextErrors.endDate = "Must be after the start date";
    }
    times.forEach((time, index) => {
      if (!time) nextErrors[`time-${index}`] = "Required";
      else if (!timePattern.test(time)) nextErrors[`time-${index}`] = "Use HH:mm";
    });
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function save() {
    if (!mosqueId || !validate()) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload: JummahSchedule = {
        allFridays,
        times,
        ...(allFridays ? {} : { startDate, endDate })
      };
      const { data } = await api.put<{ jummahSchedule: JummahSchedule }>(`/api/admin/mosques/${mosqueId}/jummah-times`, payload);
      setAllFridays(data.jummahSchedule.allFridays);
      setStartDate(data.jummahSchedule.startDate ?? "");
      setEndDate(data.jummahSchedule.endDate ?? "");
      setTimes(data.jummahSchedule.times);
      setHasSavedSchedule(true);
      setMessage("Jummah schedule saved.");
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Jummah schedule could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function updateTime(index: number, value: string) {
    setTimes((current) => current.map((time, timeIndex) => timeIndex === index ? value : time));
    setFieldErrors((current) => ({ ...current, [`time-${index}`]: "" }));
  }

  function removeTime(index: number) {
    setTimes((current) => current.filter((_time, timeIndex) => timeIndex !== index));
    setFieldErrors({});
  }

  return (
    <>
      <Button component={Link} to="/mosques" startIcon={<ArrowBackOutlinedIcon />} sx={{ mb: 1 }}>
        Back to mosques
      </Button>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "flex-end" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: "2rem", sm: "2.125rem" } }}>Jummah Times</Typography>
          <Typography color="text.secondary">Set one, two or three Friday prayer times for this mosque.</Typography>
        </Box>
        <FormControl size="small" sx={{ width: { xs: "100%", sm: 280 } }}>
          <InputLabel>Mosque</InputLabel>
          <Select
            label="Mosque"
            value={mosqueId}
            onChange={(event) => {
              const nextMosqueId = event.target.value;
              setMosqueId(nextMosqueId);
              setSearchParams({ mosqueId: nextMosqueId }, { replace: true });
            }}
          >
            {mosques.map((mosque) => <MenuItem key={mosque.id} value={mosque.id}>{mosque.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      {message && <Alert severity="success" onClose={() => setMessage("")} sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: { xs: 2, md: 3 }, maxWidth: 960, width: "100%" }}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {hasSavedSchedule ? "Edit Jummah schedule" : "Add Jummah schedule"}
            </Typography>
            <Typography variant="body2" color="text.secondary">Times are shown in the order they take place.</Typography>
          </Box>
          <Box sx={{ alignItems: "center", bgcolor: "action.hover", borderRadius: 1.5, display: "flex", gap: 1, px: 2, py: 1 }}>
            <EventAvailableOutlinedIcon color="primary" />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{allFridays ? "Every Friday" : "Selected date range"}</Typography>
          </Box>
        </Stack>

        {loading ? (
          <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={32} /></Stack>
        ) : (
          <>
            <Box sx={{ bgcolor: "action.hover", borderRadius: 1.5, p: 2, mb: 3 }}>
              <FormControlLabel
                control={<Checkbox checked={allFridays} onChange={(event) => {
                  setAllFridays(event.target.checked);
                  if (event.target.checked) {
                    setStartDate("");
                    setEndDate("");
                    setFieldErrors((current) => ({ ...current, startDate: "", endDate: "" }));
                  }
                }} />}
                label="Use these times for all Fridays"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", ml: 4 }}>
                Turn this off to apply the schedule only to Fridays inside a date range.
              </Typography>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Start date"
                  value={startDate}
                  disabled={allFridays}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setFieldErrors((current) => ({ ...current, startDate: "" }));
                  }}
                  InputLabelProps={{ shrink: true }}
                  error={Boolean(fieldErrors.startDate)}
                  helperText={fieldErrors.startDate ?? "First day of the schedule"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="End date"
                  value={endDate}
                  disabled={allFridays}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setFieldErrors((current) => ({ ...current, endDate: "" }));
                  }}
                  InputLabelProps={{ shrink: true }}
                  error={Boolean(fieldErrors.endDate)}
                  helperText={fieldErrors.endDate ?? "Last day of the schedule"}
                />
              </Grid>
            </Grid>

            <Stack spacing={2}>
              {times.map((time, index) => (
                <Box key={index} sx={{ alignItems: { xs: "stretch", sm: "flex-start" }, border: 1, borderColor: "divider", borderRadius: 1.5, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1, p: 2 }}>
                  <TextField
                    fullWidth
                    type="time"
                    label={serviceNames[index]}
                    value={time}
                    onChange={(event) => updateTime(index, event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    error={Boolean(fieldErrors[`time-${index}`])}
                    helperText={fieldErrors[`time-${index}`] ?? "Jummah start time"}
                  />
                  {times.length > 1 && (
                    <IconButton aria-label={`Remove ${serviceNames[index]}`} color="error" onClick={() => removeTime(index)} sx={{ mt: { sm: 0.75 }, alignSelf: { xs: "flex-end", sm: "auto" } }}>
                      <DeleteOutlineOutlinedIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<AddOutlinedIcon />}
                disabled={times.length >= 3}
                onClick={() => setTimes((current) => [...current, ""])}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                {times.length === 1 ? "Add second Jummah" : "Add third Jummah"}
              </Button>
              <Button variant="contained" disabled={!mosqueId || saving} onClick={() => void save()} sx={{ width: { xs: "100%", sm: "auto" } }}>
                {saving ? "Saving…" : hasSavedSchedule ? "Save changes" : "Add Jummah schedule"}
              </Button>
            </Stack>
          </>
        )}
      </Paper>
    </>
  );
}
