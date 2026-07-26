import { useEffect, useState } from "react";
import { Grid, Paper, Typography } from "@mui/material";
import { api } from "../api/client";

const labels: Record<string, string> = {
  mosques: "Total mosques",
  halalPlaces: "Total halal places",
  announcements: "Published announcements",
  events: "Published events",
  quizQuestions: "Active quiz questions",
  pushDevices: "Registered push devices",
  adminUsers: "Active admin users"
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    void api.get("/api/admin/dashboard").then(({ data }) => setStats(data));
  }, []);

  return (
    <>
      <Typography variant="h4" sx={{ mb: 3, fontSize: { xs: "2rem", sm: "2.125rem" } }}>Dashboard</Typography>
      <Grid container spacing={2}>
        {Object.entries(labels).map(([key, label]) => (
          <Grid item xs={12} sm={6} md={4} key={key}>
            <Paper sx={{ p: { xs: 2, sm: 3 }, minHeight: 132 }}>
              <Typography color="text.secondary">{label}</Typography>
              <Typography variant="h3" sx={{ fontSize: { xs: "2.75rem", sm: "3rem" } }}>{stats[key] ?? "-"}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
