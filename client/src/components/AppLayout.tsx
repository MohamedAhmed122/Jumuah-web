import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { AppBar, Box, Button, Drawer, IconButton, List, ListItemButton, ListItemText, Toolbar, Typography } from "@mui/material";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";

const navItems = [
  ["Dashboard", "/"],
  ["Calendar", "/calendar"],
  ["Admin Users", "/users"],
  ["Mosques", "/mosques"],
  ["Prayer Times", "/prayer-times"],
  ["Halal Places", "/halal-places"],
  ["Events", "/events"],
  ["Quiz Questions", "/quiz-questions"],
  ["Push Registrations", "/push-registrations"]
];

const drawerWidth = 248;

export default function AppLayout() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawer = (
    <List>
      {navItems.map(([label, href]) => (
        <ListItemButton
          key={href}
          component={NavLink}
          to={href}
          end={href === "/"}
          onClick={() => setMobileOpen(false)}
          sx={{ "&.active": { bgcolor: "action.selected" } }}
        >
          <ListItemText primary={label} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", width: "100%", overflowX: "hidden" }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: 1300,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` }
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { sm: "none" }, mr: 1 }}
            aria-label="Open navigation"
          >
            <MenuOutlinedIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            sx={{ flexGrow: 1, minWidth: 0, fontSize: { xs: "1rem", sm: "1.25rem" }, lineHeight: 1.25 }}
          >
            Muslim Community Lithuania Admin
          </Typography>
          <Button
            color="inherit"
            size="small"
            sx={{ whiteSpace: "nowrap" }}
            onClick={() => {
              localStorage.removeItem("adminToken");
              navigate("/login");
            }}
          >
            Sign out
          </Button>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} aria-label="Admin navigation">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": { width: drawerWidth, pt: 8 }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": { width: drawerWidth, pt: 8, boxSizing: "border-box" }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: "100%", sm: `calc(100% - ${drawerWidth}px)` },
          minWidth: 0,
          p: { xs: 2, sm: 3 },
          pt: { xs: 10, sm: 11 },
          overflowX: "hidden"
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
