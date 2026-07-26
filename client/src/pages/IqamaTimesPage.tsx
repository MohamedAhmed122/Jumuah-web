import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import { Link, useSearchParams } from "react-router-dom";
import { api, Paged } from "../api/client";

type Mosque = { id: string; name: string };
type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
type IqamaValues = Record<PrayerKey, { offset: string; time: string }>;
type FieldErrors = Partial<Record<PrayerKey, { offset?: string; time?: string; row?: string }>>;
type SavedOffsets = Partial<Record<PrayerKey, number>>;
type SavedTimes = Partial<Record<PrayerKey, string>>;
type IqamaResponse = {
  mosqueId: string;
  iqamaOffsets: SavedOffsets | null;
  iqamaTimes: SavedTimes | null;
};

const prayerLabels: Record<PrayerKey, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha"
};
const prayerKeys = Object.keys(prayerLabels) as PrayerKey[];
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const emptyValues: IqamaValues = {
  fajr: { offset: "", time: "" },
  dhuhr: { offset: "", time: "" },
  asr: { offset: "", time: "" },
  maghrib: { offset: "", time: "" },
  isha: { offset: "", time: "" }
};

function toInputValues(offsets: SavedOffsets | null, times: SavedTimes | null): IqamaValues {
  return Object.fromEntries(prayerKeys.map((key) => [
    key,
    {
      offset: times?.[key] ? "" : offsets?.[key] == null ? "" : String(offsets[key]),
      time: times?.[key] ?? ""
    }
  ])) as IqamaValues;
}

export default function IqamaTimesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [mosqueId, setMosqueId] = useState(searchParams.get("mosqueId") ?? "");
  const [iqamaValues, setIqamaValues] = useState<IqamaValues>(structuredClone(emptyValues));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [hasSavedSettings, setHasSavedSettings] = useState(false);
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
    setErrors({});
    void api.get<IqamaResponse>(`/api/admin/mosques/${mosqueId}/iqama-offsets`)
      .then(({ data }) => {
        setIqamaValues(toInputValues(data.iqamaOffsets, data.iqamaTimes));
        setHasSavedSettings(Boolean(data.iqamaOffsets || data.iqamaTimes));
      })
      .catch((requestError: any) => setError(requestError.response?.data?.message ?? "IQama offsets could not be loaded."))
      .finally(() => setLoading(false));
  }, [mosqueId]);

  function validate() {
    const nextErrors: FieldErrors = {};
    for (const key of prayerKeys) {
      const offsetText = iqamaValues[key].offset.trim();
      const timeText = iqamaValues[key].time.trim();
      const prayerErrors: { offset?: string; time?: string; row?: string } = {};
      if (!offsetText && !timeText) prayerErrors.row = "Enter minutes after Athan or an exact IQama time";
      if (offsetText && timeText) prayerErrors.row = "Use minutes or exact time, not both";
      if (offsetText) {
        const value = Number(offsetText);
        if (!Number.isInteger(value) || value < 0 || value > 180) prayerErrors.offset = "Enter 0–180 whole minutes";
      }
      if (timeText && !timePattern.test(timeText)) prayerErrors.time = "Use HH:mm";
      if (Object.keys(prayerErrors).length) nextErrors[key] = prayerErrors;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function save() {
    if (!mosqueId || !validate()) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        iqamaOffsets: Object.fromEntries(
          prayerKeys
            .filter((key) => iqamaValues[key].offset.trim())
            .map((key) => [key, Number(iqamaValues[key].offset)])
        ),
        iqamaTimes: Object.fromEntries(
          prayerKeys
            .filter((key) => iqamaValues[key].time.trim())
            .map((key) => [key, iqamaValues[key].time.trim()])
        )
      };
      const { data } = await api.put<IqamaResponse>(`/api/admin/mosques/${mosqueId}/iqama-offsets`, payload);
      setIqamaValues(toInputValues(data.iqamaOffsets, data.iqamaTimes));
      setHasSavedSettings(true);
      setMessage("IQama settings saved. They now apply to every day.");
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "IQama settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button component={Link} to="/mosques" startIcon={<ArrowBackOutlinedIcon />} sx={{ mb: 1 }}>
        Back to mosques
      </Button>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "flex-end" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: "2rem", sm: "2.125rem" } }}>IQama Times</Typography>
          <Typography color="text.secondary">Set minutes after Athan or an exact IQama time for each prayer.</Typography>
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
              {hasSavedSettings ? "Edit IQama settings" : "Add IQama settings"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fill one field for every prayer: minutes after Athan or exact IQama time.
            </Typography>
          </Box>
          <Box sx={{ alignItems: "center", bgcolor: "action.hover", borderRadius: 1.5, display: "flex", gap: 1, px: 2, py: 1 }}>
            <ScheduleOutlinedIcon color="primary" />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Same settings every day</Typography>
          </Box>
        </Stack>

        {loading ? (
          <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={32} /></Stack>
        ) : (
          <>
            <Grid container spacing={2}>
              {prayerKeys.map((key) => (
                <Grid item xs={12} sm={6} md={4} lg={2.4} key={key}>
                  <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{prayerLabels[key]}</Typography>
                    <Stack spacing={1.5}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Minutes after Athan"
                        placeholder="15"
                        value={iqamaValues[key].offset}
                        onChange={(event) => {
                          setIqamaValues((current) => ({
                            ...current,
                            [key]: { offset: event.target.value, time: event.target.value.trim() ? "" : current[key].time }
                          }));
                          setErrors((current) => ({ ...current, [key]: undefined }));
                        }}
                        inputProps={{ min: 0, max: 180, step: 1, "aria-label": `${prayerLabels[key]} minutes after Athan` }}
                        InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
                        error={Boolean(errors[key]?.offset || errors[key]?.row)}
                        helperText={errors[key]?.offset ?? errors[key]?.row ?? "IQama = Athan + offset"}
                      />
                      <TextField
                        fullWidth
                        label="Exact IQama time"
                        placeholder="18:18"
                        value={iqamaValues[key].time}
                        onChange={(event) => {
                          setIqamaValues((current) => ({
                            ...current,
                            [key]: { offset: event.target.value.trim() ? "" : current[key].offset, time: event.target.value }
                          }));
                          setErrors((current) => ({ ...current, [key]: undefined }));
                        }}
                        inputProps={{ inputMode: "numeric", pattern: "[0-9]{2}:[0-9]{2}", "aria-label": `${prayerLabels[key]} exact IQama time` }}
                        error={Boolean(errors[key]?.time)}
                        helperText={errors[key]?.time ?? "Use HH:mm, for example 18:18"}
                      />
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button variant="contained" disabled={!mosqueId || saving} onClick={() => void save()} sx={{ width: { xs: "100%", sm: "auto" } }}>
                {saving ? "Saving…" : hasSavedSettings ? "Save changes" : "Add IQama settings"}
              </Button>
            </Stack>
          </>
        )}
      </Paper>
    </>
  );
}
