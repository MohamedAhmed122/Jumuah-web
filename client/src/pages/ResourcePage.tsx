import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Avatar, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, List, ListItemButton, ListItemIcon, ListItemText, MenuItem, Paper, Select, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography } from "@mui/material";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import MosqueOutlinedIcon from "@mui/icons-material/MosqueOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import { useNavigate } from "react-router-dom";
import { api, Paged, uploadImage } from "../api/client";
import PlaceAutocomplete, { type PlaceOption } from "../components/PlaceAutocomplete";
import RichTextHtmlEditor from "../components/RichTextHtmlEditor";
import { FieldConfig, resources, type Lang } from "./resourceConfig";

type Row = Record<string, any>;
type ReferenceOptions = Record<string, Array<{ value: string; label: string }>>;
const allLanguages: Array<{ value: Lang; label: string }> = [
  { value: "en", label: "English" },
  { value: "ru", label: "Russian" },
  { value: "lt", label: "Lithuanian" }
];

function getValue(object: Row, path: string): any {
  return path.split(".").reduce((value, part) => value?.[part], object);
}

function setValue(object: Row, path: string, value: unknown) {
  const parts = path.split(".");
  const next = structuredClone(object);
  let target = next;
  for (const part of parts.slice(0, -1)) {
    target[part] ??= /^\d+$/.test(parts[parts.indexOf(part) + 1]) ? [] : {};
    target = target[part];
  }
  target[parts.at(-1)!] = value;
  return next;
}

function renderCell(row: Row, column: string) {
  const value = getValue(row, column);
  if (column === "image") return typeof value === "string" && value ? <Avatar src={value} variant="rounded" /> : "-";
  if (value == null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (column === "averageMealCost" && Number.isFinite(Number(value))) return `€${Number(value).toFixed(2)}`;
  if (column === "discountPercent" && Number.isFinite(Number(value))) return `${value}%`;
  if (column.toLowerCase().includes("date") && (typeof value === "string" || typeof value === "number")) return new Date(value).toLocaleString();
  if (value && typeof value === "object" && !Array.isArray(value)) return value.en || value.ru || value.lt || "-";
  return String(value);
}

function renderReferenceCell(value: unknown, options?: Array<{ value: string; label: string }>) {
  if (!value) return "-";
  const id = String(value);
  return options?.find((option) => option.value === id)?.label ?? id;
}

function hasCoordinates(row: Row) {
  return Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lng));
}

export default function ResourcePage({ resource }: { resource: string }) {
  const navigate = useNavigate();
  const config = resources[resource];
  const languages = allLanguages.filter((language) => (config?.languages ?? ["en", "ru"]).includes(language.value));
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Row | null>(null);
  const [settingsMosque, setSettingsMosque] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [referenceOptions, setReferenceOptions] = useState<ReferenceOptions>({});
  const [activeLang, setActiveLang] = useState<Lang>("en");

  const params = useMemo(() => ({ search, ...filters }), [search, filters]);

  async function load() {
    const { data } = await api.get<Paged<Row>>(config.endpoint, { params });
    setRows(data.items);
    setTotal(data.total);
  }

  useEffect(() => {
    void load();
  }, [resource, params]);

  useEffect(() => {
    const needsMosques = config.fields.some((field) => field.type === "reference" && field.source === "mosques");
    if (!needsMosques) return;
    void api.get<Paged<Row>>("/api/admin/mosques", { params: { pageSize: 100 } }).then(({ data }) => {
      setReferenceOptions((current) => ({
        ...current,
        mosques: data.items.map((mosque) => ({ value: mosque.id, label: mosque.name }))
      }));
    });
  }, [config.fields]);

  function openCreate() {
    setActiveLang("en");
    setEditing(structuredClone(config.defaults));
  }

  async function save() {
    if (!editing) return;
    setError("");
    if (config.fields.some((field) => field.type === "placeAutocomplete") && !hasCoordinates(editing)) {
      setError("Please select an address from autocomplete so latitude and longitude can be saved.");
      return;
    }
    try {
      if (editing.id) await api.put(`${config.endpoint}/${editing.id}`, editing);
      else await api.post(config.endpoint, editing);
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Save failed");
    }
  }

  async function remove(row: Row) {
    if (!confirm("Delete or deactivate this item?")) return;
    await api.delete(`${config.endpoint}/${row.id}`);
    await load();
  }

  async function importQuiz(file: File) {
    const text = await file.text();
    const items = JSON.parse(text);
    await api.post("/api/admin/quiz-questions/import", { items: Array.isArray(items) ? items : items.items });
    await load();
  }

  if (!config) return <Alert severity="error">Unknown resource</Alert>;

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">{config.title}</Typography>
          <Typography color="text.secondary">{total} records</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {resource === "quiz-questions" && (
            <Button component="label" variant="outlined">
              Import JSON
              <input hidden type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && void importQuiz(event.target.files[0])} />
            </Button>
          )}
          <Button variant="contained" onClick={openCreate}>Create</Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} size="small" />
          {config.filters?.map((field) => (
            <FormControl size="small" sx={{ minWidth: 180 }} key={field.name}>
              <InputLabel>{field.label}</InputLabel>
              <Select label={field.label} value={filters[field.name] ?? ""} onChange={(event) => setFilters((current) => ({ ...current, [field.name]: event.target.value }))}>
                <MenuItem value="">All</MenuItem>
                {field.options?.map((option) => <MenuItem value={option} key={option}>{option}</MenuItem>)}
              </Select>
            </FormControl>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {config.columns.map((column) => <TableCell key={column}>{column}</TableCell>)}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {config.columns.map((column) => (
                  <TableCell key={column}>
                    {column === "locationId" ? renderReferenceCell(getValue(row, column), referenceOptions.mosques) : renderCell(row, column)}
                  </TableCell>
                ))}
                <TableCell align="right">
                  {resource === "mosques" && (
                    <Button
                      size="small"
                      startIcon={<SettingsOutlinedIcon />}
                      onClick={() => setSettingsMosque(row)}
                    >
                      Settings
                    </Button>
                  )}
                  <Button size="small" onClick={() => {
                    setActiveLang("en");
                    setEditing(row);
                  }}>Edit</Button>
                  <Button size="small" color="error" onClick={() => void remove(row)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={Boolean(settingsMosque)} onClose={() => setSettingsMosque(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Mosque settings</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {settingsMosque?.name ?? "Mosque"}
          </Typography>
          <List disablePadding sx={{ display: "grid", gap: 1.25 }}>
            {[
              { label: "Mosque Prayer Times", icon: <MosqueOutlinedIcon />, path: "/prayer-times" },
              { label: "IQama Times", icon: <AccessTimeOutlinedIcon />, path: "/iqama-times" },
              { label: "Jummah Times", icon: <TodayOutlinedIcon />, path: "/jummah-times" },
              { label: "Calendar", icon: <CalendarMonthOutlinedIcon />, path: "/calendar" },
              { label: "Announcements", icon: <CampaignOutlinedIcon />, path: "/announcements" },
              { label: "Events", icon: <EventAvailableOutlinedIcon />, path: "/events" },
              { label: "Notifications", icon: <NotificationsActiveOutlinedIcon />, path: "/notifications" }
            ].map((option) => (
              <Paper
                component="li"
                variant="outlined"
                key={option.label}
                sx={{ listStyle: "none", overflow: "hidden", borderLeft: 3, borderLeftColor: "primary.main" }}
              >
                <ListItemButton
                  disabled={!option.path}
                  onClick={() => {
                    if (!option.path || !settingsMosque) return;
                    setSettingsMosque(null);
                    navigate(`${option.path}?mosqueId=${settingsMosque.id}`);
                  }}
                  sx={{ minHeight: 64, px: 2, py: 1.25, "&.Mui-disabled": { opacity: 1 } }}
                >
                  <ListItemIcon sx={{ color: "primary.main", minWidth: 42 }}>{option.icon}</ListItemIcon>
                  <ListItemText primary={option.label} />
                </ListItemButton>
              </Paper>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsMosque(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="md" fullWidth>
        <DialogTitle>{editing?.id ? "Edit" : "Create"} {config.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {config.fields.some((field) => field.type.startsWith("localized")) && (
              <Tabs value={activeLang} onChange={(_event, value: Lang) => setActiveLang(value)}>
                {languages.map((language) => <Tab key={language.value} value={language.value} label={language.label} />)}
              </Tabs>
            )}
            {config.fields.map((field) => {
              if (!editing) return null;
              if (field.showWhen && getValue(editing, field.showWhen.field) !== field.showWhen.equals) return null;
              return (
                <FieldEditor
                  key={field.name}
                  field={field}
                  activeLang={activeLang}
                  options={field.source ? referenceOptions[field.source] : undefined}
                  row={editing}
                  value={getValue(editing, field.name)}
                  onChange={(value) => setEditing(setValue(editing, field.name, value))}
                  onPatch={(patch) => setEditing({ ...editing, ...patch })}
                />
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void save()}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function FieldEditor({
  field,
  activeLang,
  options,
  row,
  value,
  onChange,
  onPatch
}: {
  field: FieldConfig;
  activeLang: Lang;
  options?: Array<{ value: string; label: string }>;
  row: Row;
  value: any;
  onChange: (value: any) => void;
  onPatch: (patch: Row) => void;
}) {
  if (field.type === "boolean") {
    return (
      <Stack direction="row" alignItems="center">
        <Checkbox checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        <Typography>{field.label}</Typography>
      </Stack>
    );
  }
  if (field.type === "select") {
    return (
      <FormControl fullWidth>
        <InputLabel>{field.label}</InputLabel>
        <Select label={field.label} value={value ?? ""} onChange={(event) => onChange(field.name === "correctIndex" ? Number(event.target.value) : event.target.value)}>
          {field.options?.map((option) => <MenuItem value={option} key={option}>{option}</MenuItem>)}
        </Select>
      </FormControl>
    );
  }
  if (field.type === "tags") {
    return (
      <Autocomplete
        multiple
        freeSolo
        options={field.options ?? []}
        value={Array.isArray(value) ? value : []}
        onChange={(_event, nextValue) => {
          const normalized = [...new Map(
            nextValue
              .map((item) => String(item).trim())
              .filter(Boolean)
              .map((item) => [item.toLocaleLowerCase(), item])
          ).values()];
          onChange(normalized);
        }}
        renderTags={(tagValue, getTagProps) => tagValue.map((option, index) => (
          <Chip {...getTagProps({ index })} key={`${option}-${index}`} label={option} color="primary" variant="outlined" />
        ))}
        renderInput={(params) => (
          <TextField
            {...params}
            label={field.label}
            placeholder="Choose or type a category, then press Enter"
            helperText="Add every food style customers can use as a filter in the app."
          />
        )}
      />
    );
  }
  if (field.type === "searchableSelect") {
    return (
      <Autocomplete
        freeSolo
        options={field.options ?? []}
        value={value ?? ""}
        onChange={(_event, nextValue) => onChange(nextValue ?? "")}
        onInputChange={(_event, nextValue) => onChange(nextValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={field.label}
            required={field.required}
            helperText="Search the list or type a Lithuanian city that is not included."
          />
        )}
      />
    );
  }
  if (field.type === "reference") {
    return (
      <FormControl fullWidth>
        <InputLabel>{field.label}</InputLabel>
        <Select label={field.label} value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
          <MenuItem value="">No location</MenuItem>
          {(options ?? []).map((option) => (
            <MenuItem value={option.value} key={option.value}>{option.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }
  if (field.type === "placeAutocomplete") {
    return (
      <PlaceAutocomplete
        label={field.label}
        value={value ?? ""}
        city={typeof row.city === "string" ? row.city : undefined}
        required={field.required}
        onAddressChange={(address) => {
          onPatch({ [field.name]: address, lat: undefined, lng: undefined });
        }}
        onPlaceSelect={(place: PlaceOption) => {
          onPatch({
            [field.name]: place.address,
            lat: place.lat,
            lng: place.lng,
            ...(place.city ? { city: place.city } : {})
          });
        }}
      />
    );
  }
  if (field.type === "image") {
    return (
      <Stack spacing={1}>
        <TextField label={field.label} value={value ?? ""} onChange={(event) => onChange(event.target.value)} required={field.required} />
        <Button component="label" variant="outlined">
          Upload image
          <input
            hidden
            type="file"
            accept="image/*"
            onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files?.[0] && uploadImage(event.target.files[0]).then(onChange)}
          />
        </Button>
      </Stack>
    );
  }
  if (field.type === "richtext") {
    return <RichTextHtmlEditor label={field.label} value={value ?? ""} onChange={onChange} />;
  }
  if (field.type === "localizedText" || field.type === "localizedTextarea") {
    const localizedValue = typeof value === "object" && value ? value : { en: typeof value === "string" ? value : "", ru: "", lt: "" };
    return (
      <TextField
        label={`${field.label} (${activeLang})`}
        value={localizedValue[activeLang] ?? ""}
        onChange={(event) => onChange({ ...localizedValue, [activeLang]: event.target.value })}
        required={field.required}
        multiline={field.type === "localizedTextarea"}
        minRows={field.type === "localizedTextarea" ? 4 : undefined}
        fullWidth
      />
    );
  }
  if (field.type === "localizedRichtext") {
    const localizedValue = typeof value === "object" && value ? value : { en: typeof value === "string" ? value : "", ru: "", lt: "" };
    return (
      <RichTextHtmlEditor
        label={`${field.label} (${activeLang})`}
        value={localizedValue[activeLang] ?? ""}
        onChange={(html) => onChange({ ...localizedValue, [activeLang]: html })}
      />
    );
  }
  if (field.type === "localizedOptions") {
    const localizedValue = typeof value === "object" && value ? value : { en: Array.isArray(value) ? value : ["", "", "", ""], ru: ["", "", "", ""] };
    const currentOptions = localizedValue[activeLang] ?? ["", "", "", ""];
    return (
      <Stack spacing={1}>
        <Typography variant="subtitle2">{field.label} ({activeLang})</Typography>
        {[0, 1, 2, 3].map((index) => (
          <TextField
            key={index}
            label={`Option ${index + 1}`}
            value={currentOptions[index] ?? ""}
            onChange={(event) => {
              const nextOptions = [...currentOptions];
              nextOptions[index] = event.target.value;
              onChange({ ...localizedValue, [activeLang]: nextOptions });
            }}
            required={field.required}
            fullWidth
          />
        ))}
      </Stack>
    );
  }
  return (
    <TextField
      label={field.label}
      value={value ?? ""}
      onChange={(event) => onChange(field.type === "number" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)}
      required={field.required}
      type={field.type === "datetime" ? "datetime-local" : field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
      multiline={field.type === "textarea"}
      minRows={field.type === "textarea" ? 4 : undefined}
      InputLabelProps={field.type === "datetime" ? { shrink: true } : undefined}
      inputProps={field.type === "number" ? { min: field.min, max: field.max, step: field.step } : undefined}
      fullWidth
    />
  );
}
