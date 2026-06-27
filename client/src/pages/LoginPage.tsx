import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { api } from "../api/client";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/api/admin/auth/login", { email, password });
      localStorage.setItem("adminToken", data.token);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "background.default", p: 2 }}>
      <Paper component="form" onSubmit={submit} sx={{ width: "100%", maxWidth: 420, p: 4 }}>
        <Stack spacing={2.5}>
          <Typography variant="h5">Admin Login</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          <TextField label="Password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          <Button type="submit" variant="contained" size="large">Login</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
