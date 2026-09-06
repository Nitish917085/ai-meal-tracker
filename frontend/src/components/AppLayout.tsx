import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { AddCircle, AutoAwesome, DeleteSweep, Flag, InsertChart, Logout, Upload } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { resetDemoData, seedDemoData } from '../api/seed';
import { ApiError } from '../api/client';
import { MealDialog } from './MealDialog';
import { ConfirmDialog } from './common/ConfirmDialog';
import { BrandMark } from './common/BrandMark';

const NAV_ITEMS = [
  { label: 'Home', to: '/', icon: <AddCircle /> },
  { label: 'Insights', to: '/insights', icon: <InsertChart /> },
  { label: 'Goals', to: '/goals', icon: <Flag /> },
];

const BRAND = 'CaloriePal';
const HEADER_H = { xs: 56, md: 64 };
const ACTION_SIZE = { xs: 40, md: 44 };
const BOTTOM_NAV_H = 64;

export function AppLayout() {
  const { user, logout } = useAuth();
  const { notify } = useFeedback();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [mealDialogOpen, setMealDialogOpen] = useState(false);

  // Highlight the matching nav item; pages outside the nav (e.g. Import) highlight nothing.
  const currentPath = location.pathname;
  const tabValue = NAV_ITEMS.find((item) => item.to === currentPath)?.to ?? false;

  // Any page can request the global meal dialog (e.g. the Dashboard "Log a meal").
  useEffect(() => {
    const handler = () => setMealDialogOpen(true);
    window.addEventListener('caloriepal:open-meal-dialog', handler);
    return () => window.removeEventListener('caloriepal:open-meal-dialog', handler);
  }, []);

  const handleLogout = () => {
    setMenuAnchor(null);
    logout();
    navigate('/login');
  };

  const handleSeed = async () => {
    setMenuAnchor(null);
    setSeeding(true);
    try {
      const res = await seedDemoData();
      notify(`Added ${res.mealsCreated} demo meals across ${res.days} days.`);
      window.dispatchEvent(new Event('caloriepal:meal-saved'));
      navigate('/');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to seed demo data', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await resetDemoData();
      notify(`Deleted ${res.deleted} seeded meal entr${res.deleted === 1 ? 'y' : 'ies'}.`);
      window.dispatchEvent(new Event('caloriepal:meal-saved'));
      navigate('/');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to reset data', 'error');
    } finally {
      setResetting(false);
      setConfirmReset(false);
    }
  };

  const initial = user?.name?.charAt(0).toUpperCase() ?? 'U';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        pb: { xs: `${BOTTOM_NAV_H}px`, md: 0 },
      }}
    >
      <AppBar position="sticky" color="inherit" elevation={0}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: { xs: 0.75, md: 1 }, minHeight: HEADER_H }}>
            <Box
              component={Link}
              to="/"
              aria-label={`${BRAND} home`}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                color: 'text.primary',
                textDecoration: 'none',
                mr: { md: 4 },
              }}
            >
              <BrandMark size={24} />
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.01em', fontSize: { xs: 18, md: 20 } }}>
                {BRAND}
              </Typography>
            </Box>

            {isDesktop && (
              <Tabs
                value={tabValue}
                onChange={(_e, value: string) => navigate(value)}
                sx={{ minHeight: 64, '& .MuiTab-root': { minHeight: 64, px: 2 } }}
              >
                {NAV_ITEMS.map((item) => (
                  <Tab key={item.to} label={item.label} value={item.to} />
                ))}
              </Tabs>
            )}

            <Box sx={{ flexGrow: 1 }} />

            {isDesktop ? (
              <Button component={Link} to="/import" variant="outlined" startIcon={<Upload />} sx={{ height: 44 }}>
                Import
              </Button>
            ) : (
              <Tooltip title="Import meals">
                <IconButton
                  component={Link}
                  to="/import"
                  aria-label="Import meals"
                  sx={{
                    width: ACTION_SIZE,
                    height: ACTION_SIZE,
                    border: 1,
                    borderColor: currentPath === '/import' ? 'primary.main' : 'divider',
                    color: 'text.primary',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Upload fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Account">
              <IconButton
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                aria-label="Account menu"
                aria-haspopup="menu"
                sx={{ width: ACTION_SIZE, height: ACTION_SIZE, p: 0 }}
              >
                <Avatar sx={{ width: ACTION_SIZE, height: ACTION_SIZE, fontSize: 15, fontWeight: 700 }}>{initial}</Avatar>
              </IconButton>
            </Tooltip>
          </Toolbar>
        </Container>
      </AppBar>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 260, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" noWrap>
            {user?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem component={Link} to="/goals" onClick={() => setMenuAnchor(null)}>
          <ListItemIcon>
            <Flag fontSize="small" />
          </ListItemIcon>
          <ListItemText>Goals</ListItemText>
        </MenuItem>
        <MenuItem component={Link} to="/import" onClick={() => setMenuAnchor(null)}>
          <ListItemIcon>
            <Upload fontSize="small" />
          </ListItemIcon>
          <ListItemText>Import meals</ListItemText>
        </MenuItem>
        {import.meta.env.DEV && (
          <>
            <Divider />
            <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 1, display: 'block', lineHeight: 2 }}>
              Developer
            </Typography>
            <MenuItem onClick={handleSeed} disabled={seeding}>
          <ListItemIcon>
            <AutoAwesome fontSize="small" />
          </ListItemIcon>
          <ListItemText>{seeding ? 'Seeding…' : 'Seed demo data'}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setConfirmReset(true);
          }}
          disabled={resetting}
        >
          <ListItemIcon>
            <DeleteSweep fontSize="small" />
          </ListItemIcon>
          <ListItemText>{resetting ? 'Resetting…' : 'Reset seeded meals'}</ListItemText>
        </MenuItem>
          </>
        )}
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sign out</ListItemText>
        </MenuItem>
      </Menu>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }} className="app-content">
        <Outlet />
      </Container>

      {/* Global "log a meal" popup — reachable from the header on any page. */}
      <MealDialog
        open={mealDialogOpen}
        onClose={() => setMealDialogOpen(false)}
        onSaved={() => window.dispatchEvent(new Event('caloriepal:meal-saved'))}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Delete seeded demo meals?"
        description="Only meals created by the demo seeder will be removed. Meals you logged yourself are kept."
        confirmLabel="Delete demo meals"
        destructive
        busy={resetting}
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />

      {!isDesktop && (
        <Paper
          component="nav"
          elevation={0}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            borderTop: 1,
            borderColor: 'divider',
            pb: 'env(safe-area-inset-bottom)',
          }}
        >
          <BottomNavigation
            showLabels
            value={tabValue}
            onChange={(_e, value: string) => navigate(value)}
            sx={{ height: BOTTOM_NAV_H }}
          >
            {NAV_ITEMS.map((item) => (
              <BottomNavigationAction
                key={item.to}
                label={item.label}
                value={item.to}
                icon={item.icon}
                sx={{ minWidth: 0, px: 0.5 }}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
