import { Box, Button, Grid, LinearProgress, Skeleton, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import type { GoalComparison } from '../../api/reports';
import { macroColors } from '../../theme';

const DEFAULT_TARGET = 2000;

/**
 * The single source of truth for "how am I doing today". Used as a compact
 * strip on the Log page and as the full card on Insights and Goals, so the same
 * numbers never render three different ways.
 */
export function TodaySummary({
  data,
  loading = false,
  variant = 'full',
  linkTo,
}: {
  data: GoalComparison | null;
  loading?: boolean;
  variant?: 'compact' | 'full' | 'hero';
  /** When set, the whole summary is a link (used by the Log strip). */
  linkTo?: string;
}) {
  const compact = variant === 'compact';
  const hero = variant === 'hero';
  const frame = {
    border: 1,
    borderColor: 'divider',
    bgcolor: 'background.paper',
    px: compact ? 2 : { xs: 2, sm: 3 },
    py: compact ? 1.5 : { xs: 2, sm: 3 },
  } as const;

  if (loading || !data) {
    if (hero) {
      return (
        <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', p: { xs: 2.5, sm: 3 } }}>
          <Skeleton width="30%" />
          <Skeleton width="55%" height={56} />
          <Skeleton variant="rectangular" height={8} sx={{ my: 2 }} />
          <Skeleton width="80%" />
        </Box>
      );
    }
    return (
      <Box sx={frame}>
        <Skeleton width="40%" height={compact ? 24 : 40} />
        <Skeleton variant="rectangular" height={compact ? 6 : 10} sx={{ my: 1.5 }} />
        {!compact && <Skeleton width="60%" />}
      </Box>
    );
  }

  const hasGoal = Boolean(data.goal);
  const target = data.goal?.calories ?? DEFAULT_TARGET;
  const eaten = data.actual.calories;
  const pct = Math.min(100, (eaten / target) * 100);
  const remaining = target - eaten;
  const over = remaining < 0;

  const macros = [
    ['Protein', 'P', data.actual.protein, data.goal?.protein ?? 0, macroColors.protein],
    ['Carbs', 'C', data.actual.carbs, data.goal?.carbs ?? 0, macroColors.carbs],
    ['Fat', 'F', data.actual.fat, data.goal?.fat ?? 0, macroColors.fat],
  ] as const;

  const goalHint = !hasGoal && (
    <Typography variant="caption" component={Link} to="/goals" sx={{ color: 'secondary.main', fontWeight: 600, textDecoration: 'none' }}>
      Set a daily goal
    </Typography>
  );

  if (hero) {
    const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const muted = 'text.secondary';
    const track = '#ececec';
    const heroBody = (
      <Box sx={{ bgcolor: 'background.paper', color: 'text.primary', border: 1, borderColor: 'divider', p: { xs: 2.5, sm: 3 }, position: 'relative', overflow: 'hidden' }}>
        {/* Brand notch, echoes the logo mark. */}
        <Box aria-hidden sx={{ position: 'absolute', right: 0, top: 0, width: 14, height: 14, bgcolor: 'secondary.main' }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
          <Typography variant="overline" sx={{ color: muted, lineHeight: 1.5, letterSpacing: '0.12em' }}>
            Today
          </Typography>
          <Typography variant="caption" sx={{ color: muted }}>
            {dateLabel}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, mb: 2 }}>
          <Box>
            <Typography component="div" sx={{ fontSize: { xs: 44, sm: 52 }, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em' }}>
              {Math.round(eaten)}
            </Typography>
            <Typography variant="body2" sx={{ color: muted, mt: 0.5 }}>
              of {target} kcal{hasGoal ? '' : ' (default)'}
            </Typography>
          </Box>
          {hasGoal ? (
            <Box sx={{ textAlign: 'right' }}>
              <Typography component="div" sx={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1, color: over ? 'secondary.main' : 'text.primary' }}>
                {Math.abs(Math.round(remaining))}
              </Typography>
              <Typography variant="caption" sx={{ color: muted }}>
                kcal {over ? 'over' : 'left'}
              </Typography>
            </Box>
          ) : (
            <Button
              component={Link}
              to="/goals"
              variant="contained"
              color="secondary"
              size="small"
              onClick={(e) => e.stopPropagation()}
              sx={{ flexShrink: 0 }}
            >
              Set a daily goal
            </Button>
          )}
        </Box>

        <LinearProgress
          variant="determinate"
          value={pct}
          aria-label={`${Math.round(pct)} percent of calorie goal`}
          sx={{ height: 8, bgcolor: track, '& .MuiLinearProgress-bar': { bgcolor: 'secondary.main' }, mb: 2.5 }}
        />

        <Grid container spacing={2}>
          {macros.map(([label, , value, goal, color]) => (
            <Grid item xs={4} key={label}>
              <Typography variant="caption" sx={{ color: muted, display: 'block' }}>
                {label}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {Math.round(value)}
                <Typography component="span" variant="caption" sx={{ color: muted }}>
                  {goal ? ` / ${Math.round(goal)}g` : 'g'}
                </Typography>
              </Typography>
              <Box sx={{ height: 4, bgcolor: track, mt: 0.75 }}>
                <Box sx={{ height: '100%', width: `${goal ? Math.min(100, (value / goal) * 100) : 0}%`, bgcolor: color }} />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
    if (linkTo) {
      return (
        <Box component={Link} to={linkTo} aria-label="Open insights" sx={{ display: 'block', textDecoration: 'none', color: 'inherit', '&:hover > div': { borderColor: 'primary.main' } }}>
          {heroBody}
        </Box>
      );
    }
    return heroBody;
  }

  const content = compact ? (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2, mb: 1 }}>
        <Typography variant="body2">
          <Box component="span" sx={{ fontWeight: 700, fontSize: 18 }}>
            {Math.round(eaten)}
          </Box>
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {' '}/ {target} kcal today
          </Box>
        </Typography>
        {goalHint || (
          <Typography variant="body2" color={over ? 'secondary.main' : 'text.secondary'} sx={{ whiteSpace: 'nowrap' }}>
            {Math.abs(Math.round(remaining))} {over ? 'over' : 'left'}
          </Typography>
        )}
      </Box>
      <LinearProgress variant="determinate" value={pct} sx={{ height: 6 }} aria-label={`${Math.round(pct)} percent of calorie goal`} />
      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        {macros.map(([, short, value, goal, color]) => (
          <Box key={short} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 8, height: 8, bgcolor: color }} />
            <Typography variant="caption" color="text.secondary">
              {short}{' '}
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                {Math.round(value)}
              </Box>
              {goal ? `/${Math.round(goal)}g` : 'g'}
            </Typography>
          </Box>
        ))}
      </Box>
    </>
  ) : (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1.5, gap: 2 }}>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            Calories today
          </Typography>
          <Typography variant="h4" sx={{ lineHeight: 1.1 }}>
            {Math.round(eaten)}
            <Typography component="span" variant="body1" color="text.secondary" sx={{ ml: 1 }}>
              / {target} kcal
            </Typography>
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          {goalHint || (
            <>
              <Typography variant="h6" sx={{ lineHeight: 1.1 }} color={over ? 'secondary.main' : 'text.primary'}>
                {Math.abs(Math.round(remaining))}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                kcal {over ? 'over' : 'remaining'}
              </Typography>
            </>
          )}
        </Box>
      </Box>
      <LinearProgress variant="determinate" value={pct} aria-label={`${Math.round(pct)} percent of calorie goal`} sx={{ height: 10, mb: 3 }} />
      <Grid container spacing={2}>
        {macros.map(([label, , value, goal, color]) => (
          <Grid item xs={4} key={label}>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              {Math.round(value)}
              <Typography component="span" variant="caption" color="text.secondary">
                {goal ? ` / ${Math.round(goal)}g` : 'g'}
              </Typography>
            </Typography>
            <LinearProgress
              variant="determinate"
              value={goal ? Math.min(100, (value / goal) * 100) : 0}
              sx={{ height: 6, mt: 0.75, '& .MuiLinearProgress-bar': { bgcolor: color } }}
            />
          </Grid>
        ))}
      </Grid>
    </>
  );

  if (linkTo) {
    return (
      <Box component={Link} to={linkTo} aria-label="Open insights" sx={{ ...frame, display: 'block', textDecoration: 'none', color: 'inherit', '&:hover': { borderColor: 'primary.main' } }}>
        {content}
      </Box>
    );
  }
  return <Box sx={frame}>{content}</Box>;
}
