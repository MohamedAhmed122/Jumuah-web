import { useEffect, useState } from "react";
import { Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { api, Paged } from "../api/client";

type PushRegistration = {
  id: string;
  deviceId: string;
  token: string;
  lang: "en" | "ru" | "lt";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function PushRegistrationsPage() {
  const [rows, setRows] = useState<PushRegistration[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void api.get<Paged<PushRegistration>>("/api/admin/push-registrations", { params: { search, pageSize: 100 } }).then(({ data }) => setRows(data.items));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [search]);

  return (
    <>
      <Typography variant="h4" sx={{ mb: 2 }}>Push Registrations</Typography>
      <TextField label="Search" size="small" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 2 }} />
      <Paper sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["deviceId", "token", "lang", "active", "created", "updated"].map((head) => <TableCell key={head}>{head}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.deviceId}</TableCell>
                <TableCell>{row.token.slice(0, 24)}...</TableCell>
                <TableCell>{row.lang}</TableCell>
                <TableCell>{row.isActive ? "Yes" : "No"}</TableCell>
                <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                <TableCell>{new Date(row.updatedAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
