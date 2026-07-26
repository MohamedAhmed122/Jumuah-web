import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { AppBar, Box, Button, Drawer, List, ListItemButton, ListItemText, Toolbar, Typography } from "@mui/material";

const navItems = [
  ["Dashboard", "/"],
  ["Admin Users", "/users"],
  ["Mosques", "/mosques"],
  ["Prayer Times", "/prayer-times"],
  ["Halal Places", "/halal-places"],
  ["Events", "/events"],
  ["Quiz Questions", "/quiz-questions"],
  ["Push Registrations", "/push-registrations"]
];

export default function AppLayout() {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar position="fixed" sx={{ zIndex: 1300 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Muslim Community Lithuania Admin</Typography>
          <Button
            color="inherit"
            onClick={() => {
              localStorage.removeItem("adminToken");
              navigate("/login");
            }}
          >
            Sign out
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" sx={{ width: 248, flexShrink: 0, "& .MuiDrawer-paper": { width: 248, pt: 8 } }}>
        <List>
          {navItems.map(([label, href]) => (
            <ListItemButton key={href} component={NavLink} to={href} end={href === "/"} sx={{ "&.active": { bgcolor: "action.selected" } }}>
              <ListItemText primary={label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, pt: 11, minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
