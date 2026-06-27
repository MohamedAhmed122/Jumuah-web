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
type OffsetValues = Record<PrayerKey, string>;
type SavedOffsets = Record<PrayerKey, number>;

const prayerLabels: Record<PrayerKey, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha"
};
const prayerKeys = Object.keys(prayerLabels) as PrayerKey[];
const emptyOffsets: OffsetValues = { fajr: "", dhuhr: "", asr: "", maghrib: "", isha: "" };

function toInputValues(offsets: SavedOffsets | null): OffsetValues {
  if (!offsets) return { ...emptyOffsets };
  return Object.fromEntries(prayerKeys.map((key) => [key, String(offsets[key])])) as OffsetValues;
}

export default function IqamaTimesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [mosqueId, setMosqueId] = useState(searchParams.get("mosqueId") ?? "");
  const [offsets, setOffsets] = useState<OffsetValues>({ ...emptyOffsets });
  const [errors, setErrors] = useState<Partial<Record<PrayerKey, string>>>({});
  const [hasSavedOffsets, setHasSavedOffsets] = useState(false);
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
    void api.get<{ mosqueId: string; iqamaOffsets: SavedOffsets | null }>(`/api/admin/mosques/${mosqueId}/iqama-offsets`)
      .then(({ data }) => {
        setOffsets(toInputValues(data.iqamaOffsets));
        setHasSavedOffsets(Boolean(data.iqamaOffsets));
      })
      .catch((requestError: any) => setError(requestError.response?.data?.message ?? "IQama offsets could not be loaded."))
      .finally(() => setLoading(false));
  }, [mosqueId]);

  function validate() {
    const nextErrors: Partial<Record<PrayerKey, string>> = {};
    for (const key of prayerKeys) {
      const value = Number(offsets[key]);
      if (offsets[key] === "") nextErrors[key] = "Required";
      else if (!Number.isInteger(value) || value < 0 || value > 180) nextErrors[key] = "Enter 0–180 whole minutes";
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
      const payload = Object.fromEntries(prayerKeys.map((key) => [key, Number(offsets[key])])) as SavedOffsets;
      const { data } = await api.put<{ iqamaOffsets: SavedOffsets }>(`/api/admin/mosques/${mosqueId}/iqama-offsets`, payload);
      setOffsets(toInputValues(data.iqamaOffsets));
      setHasSavedOffsets(true);
      setMessage("IQama offsets saved. They now apply to every day.");
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "IQama offsets could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button component={Link} to="/mosques" startIcon={<ArrowBackOutlinedIcon />} sx={{ mb: 1 }}>
        Back to mosques
      </Button>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "flex-end" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>IQama Times</Typography>
          <Typography color="text.secondary">Set a fixed number of minutes after Athan for each prayer.</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 280 } }}>
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

      <Paper sx={{ p: { xs: 2, md: 3 }, maxWidth: 960 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {hasSavedOffsets ? "Edit IQama offsets" : "Add IQama offsets"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The calculated IQama time is the day’s Athan time plus the minutes below.
            </Typography>
          </Box>
          <Box sx={{ alignItems: "center", bgcolor: "action.hover", borderRadius: 1.5, display: "flex", gap: 1, px: 2, py: 1 }}>
            <ScheduleOutlinedIcon color="primary" />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Same offsets every day</Typography>
          </Box>
        </Stack>

        {loading ? (
          <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={32} /></Stack>
        ) : (
          <>
            <Grid container spacing={2}>
              {prayerKeys.map((key) => (
                <Grid item xs={12} sm={6} md={2.4} key={key}>
                  <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{prayerLabels[key]}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                      Minutes after Athan
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      placeholder="15"
                      value={offsets[key]}
                      onChange={(event) => {
                        setOffsets((current) => ({ ...current, [key]: event.target.value }));
                        setErrors((current) => ({ ...current, [key]: undefined }));
                      }}
                      inputProps={{ min: 0, max: 180, step: 1, "aria-label": `${prayerLabels[key]} minutes after Athan` }}
                      InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
                      error={Boolean(errors[key])}
                      helperText={errors[key] ?? "IQama = Athan + offset"}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button variant="contained" disabled={!mosqueId || saving} onClick={() => void save()}>
                {saving ? "Saving…" : hasSavedOffsets ? "Save changes" : "Add IQama offsets"}
              </Button>
            </Stack>
          </>
        )}
      </Paper>
    </>
  );
}
