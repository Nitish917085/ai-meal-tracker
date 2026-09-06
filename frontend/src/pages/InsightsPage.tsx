import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { DashboardPage } from './DashboardPage';
import { ReportsPage } from './ReportsPage';
import { MealsPage } from './MealsPage';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'reports', label: 'Reports' },
  { key: 'meals', label: 'Meals' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

/** Review side of the app: today, trends and the meal history under one roof. */
export function InsightsPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : 'overview';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        // Viewport height minus (app header + container padding + mobile bottom nav).
        height: { xs: 'calc(100dvh - 168px)', md: 'calc(100dvh - 128px)' },
      }}
    >
      <Box sx={{ flexShrink: 0 }}>
        <PageHeader title="Insights" subtitle="How you're tracking against your goals" />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={tab}
          onChange={(_e, v: TabKey | null) => v && setParams(v === 'overview' ? {} : { tab: v }, { replace: true })}
          aria-label="Insights section"
          sx={{ mt: 2, mb: 3, width: { xs: '100%', sm: 'auto' }, '& .MuiToggleButton-root': { height: 40, flex: 1, minWidth: { sm: 120 } } }}
        >
          {TABS.map((t) => (
            <ToggleButton key={t.key} value={t.key}>
              {t.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {tab === 'overview' && <DashboardPage embedded />}
        {tab === 'reports' && <ReportsPage embedded />}
        {tab === 'meals' && <MealsPage embedded />}
      </Box>
    </Box>
  );
}
