import { Box, type SxProps, type Theme } from '@mui/material';
import { BakeryDining, Cookie, DinnerDining, LunchDining } from '@mui/icons-material';
import type { MealType } from '../../types';

const ICONS: Record<MealType, typeof BakeryDining> = {
  breakfast: BakeryDining,
  lunch: LunchDining,
  dinner: DinnerDining,
  snack: Cookie,
};

/** Monochrome icon for a meal type. Replaces emoji so rendering is consistent across platforms. */
export function MealTypeIcon({
  type,
  size = 40,
  filled = false,
  sx,
}: {
  type: MealType;
  size?: number;
  /** Filled = black square with white glyph; otherwise light square with black glyph. */
  filled?: boolean;
  sx?: SxProps<Theme>;
}) {
  const Icon = ICONS[type];
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        bgcolor: filled ? 'primary.main' : '#f0f0f0',
        color: filled ? '#fff' : 'text.primary',
        ...sx,
      }}
    >
      <Icon sx={{ fontSize: size * 0.55 }} />
    </Box>
  );
}

export { ICONS as MEAL_TYPE_ICONS };
