import { createTheme } from '@mui/material/styles';

/**
 * Calorie-tracking theme: a calm, health-focused palette.
 * Emerald green is the primary action color, amber is the accent
 * (calories / goals / highlights), and soft mint is the tertiary surface.
 * Every corner uses a 4px border radius, including components that ship
 * with their own hardcoded radii.
 */

// Brand
const PRIMARY = '#16A34A'; // emerald green
const PRIMARY_DARK = '#15803D';
const PRIMARY_LIGHT = '#22C55E';
const SECONDARY = '#F59E0B'; // amber
const SECONDARY_DARK = '#D97706';
const SECONDARY_LIGHT = '#FBBF24';
const MINT = '#ECFDF5'; // tertiary — soft mint

// Neutrals
const WHITE = '#FFFFFF';
const BACKGROUND = '#F8FAFC';
const BORDER = '#E2E8F0';
const TEXT_PRIMARY = '#0F172A';
const TEXT_SECONDARY = '#64748B';
const TEXT_DISABLED = '#94A3B8';

// Semantic
const ERROR = '#DC2626';
const ERROR_DARK = '#B91C1C';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: PRIMARY,
      dark: PRIMARY_DARK,
      light: PRIMARY_LIGHT,
      contrastText: WHITE,
    },
    secondary: {
      main: SECONDARY,
      dark: SECONDARY_DARK,
      light: SECONDARY_LIGHT,
      contrastText: TEXT_PRIMARY,
    },
    background: {
      default: BACKGROUND,
      paper: WHITE,
    },
    text: {
      primary: TEXT_PRIMARY,
      secondary: TEXT_SECONDARY,
      disabled: TEXT_DISABLED,
    },
    divider: BORDER,
    error: { main: ERROR, dark: ERROR_DARK, contrastText: WHITE },
    warning: { main: SECONDARY, dark: SECONDARY_DARK, contrastText: TEXT_PRIMARY },
    info: { main: PRIMARY, contrastText: WHITE },
    success: { main: PRIMARY, dark: PRIMARY_DARK, contrastText: WHITE },
    action: {
      hover: 'rgba(22, 163, 74, 0.08)',
      selected: 'rgba(22, 163, 74, 0.14)',
      focus: 'rgba(22, 163, 74, 0.20)',
    },
  },
  shape: {
    borderRadius: 4,
  },
  typography: {
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: BACKGROUND, color: TEXT_PRIMARY },
        '::selection': { backgroundColor: PRIMARY, color: WHITE },
        a: { color: PRIMARY_DARK },
        // Keyboard focus: one visible, on-brand ring everywhere (links, native inputs, custom elements).
        ':focus-visible': { outline: `2px solid ${PRIMARY}`, outlineOffset: 2 },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        // MUI removes the native outline; restore it for keyboard users only.
        root: { '&.Mui-focusVisible': { outline: `2px solid ${PRIMARY}`, outlineOffset: 2 } },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 4, paddingInline: 18, boxShadow: 'none' },
        containedPrimary: {
          backgroundColor: PRIMARY,
          '&:hover': { backgroundColor: PRIMARY_DARK, boxShadow: 'none' },
        },
        containedSecondary: {
          backgroundColor: SECONDARY,
          color: TEXT_PRIMARY,
          '&:hover': { backgroundColor: SECONDARY_DARK, color: TEXT_PRIMARY, boxShadow: 'none' },
        },
        outlinedPrimary: {
          borderColor: PRIMARY,
          color: PRIMARY_DARK,
          '&:hover': { borderColor: PRIMARY_DARK, backgroundColor: 'rgba(22,163,74,0.08)' },
        },
        outlinedSecondary: {
          borderColor: SECONDARY,
          color: SECONDARY_DARK,
          '&:hover': { borderColor: SECONDARY_DARK, backgroundColor: 'rgba(245,158,11,0.08)' },
        },
        textPrimary: { color: PRIMARY_DARK },
        textSecondary: { color: SECONDARY_DARK },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 4 },
        colorPrimary: { color: PRIMARY },
        colorSecondary: { color: SECONDARY_DARK },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', borderRadius: 4 },
        rounded: { borderRadius: 4 },
        elevation: { boxShadow: 'none' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          boxShadow: 'none',
          border: `1px solid ${BORDER}`,
          backgroundColor: WHITE,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: WHITE,
          color: TEXT_PRIMARY,
          backgroundImage: 'none',
          borderBottom: `1px solid ${BORDER}`,
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: { backgroundColor: WHITE, borderTop: `1px solid ${BORDER}` },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: { color: TEXT_SECONDARY, '&.Mui-selected': { color: PRIMARY } },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: WHITE,
          // Inputs already show focus via the 2px emerald border; skip the extra ring.
          '& input:focus-visible, & textarea:focus-visible': { outline: 'none' },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: PRIMARY },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: PRIMARY, borderWidth: 2 },
        },
        notchedOutline: { borderRadius: 4 },
      },
    },
    MuiFilledInput: { styleOverrides: { root: { borderRadius: 4 } } },
    MuiInputBase: { styleOverrides: { root: { borderRadius: 4 } } },
    MuiInputLabel: {
      styleOverrides: { root: { '&.Mui-focused': { color: PRIMARY } } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: '#F1F5F9', color: TEXT_PRIMARY },
        colorPrimary: { backgroundColor: PRIMARY, color: WHITE },
        colorSecondary: { backgroundColor: SECONDARY, color: TEXT_PRIMARY },
        outlined: { borderColor: PRIMARY, backgroundColor: 'transparent' },
        outlinedSecondary: { borderColor: SECONDARY, color: SECONDARY_DARK },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: PRIMARY, color: WHITE },
        circular: { borderRadius: 4 },
        rounded: { borderRadius: 4 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 4 },
        standardError: { backgroundColor: '#FEF2F2', color: TEXT_PRIMARY, border: `1px solid ${ERROR}` },
        standardSuccess: { backgroundColor: MINT, color: TEXT_PRIMARY, border: `1px solid ${PRIMARY}` },
        standardWarning: { backgroundColor: '#FFF7ED', color: TEXT_PRIMARY, border: `1px solid ${SECONDARY}` },
        standardInfo: { backgroundColor: '#F1F5F9', color: TEXT_PRIMARY, border: `1px solid ${BORDER}` },
        filledError: { backgroundColor: ERROR, color: WHITE },
        filledSuccess: { backgroundColor: PRIMARY, color: WHITE },
        filledWarning: { backgroundColor: SECONDARY, color: TEXT_PRIMARY },
        filledInfo: { backgroundColor: TEXT_PRIMARY, color: WHITE },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 4, border: `1px solid ${BORDER}`, boxShadow: 'none' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 4, border: `1px solid ${BORDER}`, boxShadow: 'none' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': { backgroundColor: 'rgba(22,163,74,0.12)', color: PRIMARY_DARK },
          '&:hover': { backgroundColor: 'rgba(22,163,74,0.08)', color: PRIMARY_DARK },
        },
      },
    },
    MuiPopover: {
      styleOverrides: { paper: { borderRadius: 4 } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 4, backgroundColor: TEXT_PRIMARY, color: WHITE },
        arrow: { color: TEXT_PRIMARY },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: TEXT_PRIMARY, color: WHITE },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: BORDER },
        bar: { borderRadius: 4, backgroundColor: PRIMARY },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          borderColor: PRIMARY,
          color: TEXT_PRIMARY,
          '&.Mui-selected': { backgroundColor: PRIMARY, color: WHITE, '&:hover': { backgroundColor: PRIMARY_DARK } },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: { borderRadius: 4 },
        grouped: {
          // Only round the outer corners; the joined inner edges stay square so
          // adjacent buttons meet cleanly without white gaps at the seams.
          borderRadius: 0,
          '&:first-of-type': { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
          '&:last-of-type': { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          '&.Mui-selected': { backgroundColor: PRIMARY, color: WHITE, '&:hover': { backgroundColor: PRIMARY_DARK } },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${BORDER}` },
        head: { backgroundColor: TEXT_PRIMARY, color: WHITE, fontWeight: 700 },
      },
    },
    MuiTableRow: {
      styleOverrides: { root: { '&:hover': { backgroundColor: 'rgba(22,163,74,0.04)' } } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: BORDER } },
    },
    MuiSkeleton: {
      styleOverrides: { root: { borderRadius: 4 } },
    },
    MuiBadge: {
      styleOverrides: { badge: { borderRadius: 4, backgroundColor: PRIMARY, color: WHITE } },
    },
    MuiTabs: {
      styleOverrides: { indicator: { backgroundColor: PRIMARY, height: 3 } },
    },
    MuiTab: {
      styleOverrides: { root: { color: TEXT_SECONDARY, '&.Mui-selected': { color: PRIMARY_DARK } } },
    },
    MuiSwitch: {
      styleOverrides: {
        track: { borderRadius: 4 },
        thumb: { borderRadius: 4 },
        switchBase: { '&.Mui-checked': { color: PRIMARY }, '&.Mui-checked + .MuiSwitch-track': { backgroundColor: PRIMARY } },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: PRIMARY },
        thumb: { borderRadius: 4 },
        track: { borderRadius: 4 },
        rail: { borderRadius: 4 },
      },
    },
    MuiCheckbox: {
      styleOverrides: { root: { color: TEXT_SECONDARY, '&.Mui-checked': { color: PRIMARY } } },
    },
    MuiRadio: {
      styleOverrides: { root: { color: TEXT_SECONDARY, '&.Mui-checked': { color: PRIMARY } } },
    },
    MuiLink: {
      styleOverrides: { root: { color: PRIMARY_DARK } },
    },
    MuiCircularProgress: {
      styleOverrides: { root: { color: PRIMARY } },
    },
    MuiFab: {
      styleOverrides: { root: { borderRadius: 4, boxShadow: 'none' } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: 4, '&.Mui-selected': { backgroundColor: 'rgba(22,163,74,0.12)' } },
      },
    },
    MuiAccordion: {
      styleOverrides: { root: { borderRadius: 4, '&:first-of-type, &:last-of-type': { borderRadius: 4 } } },
    },
  },
});

/** Shared colors for macronutrient charts and progress bars. */
export const macroColors = {
  protein: '#3B82F6', // blue
  carbs: SECONDARY, // amber
  fat: '#F43F5E', // rose
} as const;

/** Accent used for chart bars and lines. */
export const chartAccentColor = PRIMARY;

/** Light grey used for chart "target"/empty backgrounds. */
export const chartMutedColor = BORDER;
