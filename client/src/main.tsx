import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ResourcePage from "./pages/ResourcePage";
import PrayerTimesPage from "./pages/PrayerTimesPage";
import IqamaTimesPage from "./pages/IqamaTimesPage";
import JummahTimesPage from "./pages/JummahTimesPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import EventsPage from "./pages/EventsPage";
import NotificationsPage from "./pages/NotificationsPage";
import PushRegistrationsPage from "./pages/PushRegistrationsPage";

const theme = createTheme({
  palette: {
    primary: { main: "#136f63" },
    secondary: { main: "#c08a2c" },
    background: { default: "#f7f8f5" }
  },
  shape: { borderRadius: 8 }
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  return localStorage.getItem("adminToken") ? <>{children}</> : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<ResourcePage resource="users" />} />
            <Route path="mosques" element={<ResourcePage resource="mosques" />} />
            <Route path="prayer-times" element={<PrayerTimesPage />} />
            <Route path="iqama-times" element={<IqamaTimesPage />} />
            <Route path="jummah-times" element={<JummahTimesPage />} />
            <Route path="halal-places" element={<ResourcePage resource="halal-places" />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="quiz-questions" element={<ResourcePage resource="quiz-questions" />} />
            <Route path="push-registrations" element={<PushRegistrationsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
