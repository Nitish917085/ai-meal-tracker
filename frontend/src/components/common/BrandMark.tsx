import { Box, type SxProps, type Theme } from '@mui/material';

/**
 * CaloriePal mark: a black square with a red "notch" — a simple geometric logo
 * that works at any size and stays on-brand (black + red, square corners).
 */
export function BrandMark({ size = 32, sx }: { size?: number; sx?: SxProps<Theme> }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        position: 'relative',
        bgcolor: 'primary.main',
        flexShrink: 0,
        ...sx,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '45%',
          height: '45%',
          bgcolor: 'secondary.main',
        }}
      />
    </Box>
  );
}
