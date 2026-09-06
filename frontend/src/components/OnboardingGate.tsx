import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { getGoals } from '../api/goals';
import { isOnboarded } from '../utils/onboarding';

/**
 * First-run onboarding gate. Redirects newly-registered users (and anyone who
 * has never set a goal or skipped onboarding) to /onboarding. Once the user
 * saves or skips, `isOnboarded()` returns true and the app is reachable.
 */
export function OnboardingGate() {
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (isOnboarded()) {
      setNeedsOnboarding(false);
      setChecked(true);
      return;
    }

    getGoals()
      .then((res) => {
        if (!cancelled) setNeedsOnboarding(!res.active);
      })
      .catch(() => {
        if (!cancelled) setNeedsOnboarding(false);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (!checked) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  if (!needsOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
