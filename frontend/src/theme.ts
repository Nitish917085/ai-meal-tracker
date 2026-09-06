import { createTheme } from '@mui/material/styles';

/**
 * Typeface-style theme: white canvas, black as the primary action color,
 * red as the accent. Every corner is square (border radius 0), including
 * components that ship with their own hardcoded radii.
 */

const BLACK = '#0a0a0a';
const BLACK_HOVER = '#262626';
const RED = '#e5232b';
const RED_DARK = '#b8161d';
const RED_LIGHT = '#ff5a60';
const WHITE = '#ffffff';
const CANVAS = '#fafafa';
const BORDER = '#e5e5e5';
const TEXT_SECONDARY = '#5c5c5c';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: BLACK,
      dark: '#000000',
      light: BLACK_HOVER,
      contrastText: WHITE,
    },
    secondary: {
      main: RED,
      dark: RED_DARK,
      light: RED_LIGHT,
      contrastText: WHITE,
    },
    background: {
      default: CANVAS,
      paper: WHITE,
    },
    text: {
      primary: BLACK,
      secondary: TEXT_SECONDARY,
      disabled: '#a3a3a3',
    },
    divider: BORDER,
    error: { main: RED, dark: RED_DARK, contrastText: WHITE },
    warning: { main: BLACK, contrastText: WHITE },
    info: { main: BLACK, contrastText: WHITE },
    success: { main: BLACK, contrastText: WHITE },
    action: {
      hover: 'rgba(10, 10, 10, 0.05)',
      selected: 'rgba(229, 35, 43, 0.10)',
      focus: 'rgba(229, 35, 43, 0.16)',
    },
  },
  shape: {
    borderRadius: 0,
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
        body: { backgroundColor: CANVAS, color: BLACK },
        '::selection': { backgroundColor: RED, color: WHITE },
        a: { color: RED },
        // Keyboard focus: one visible, on-brand ring everywhere (links, native inputs, custom elements).
        ':focus-visible': { outline: `2px solid ${BLACK}`, outlineOffset: 2 },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        // MUI removes the native outline; restore it for keyboard users only.
        root: { '&.Mui-focusVisible': { outline: `2px solid ${BLACK}`, outlineOffset: 2 } },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 0, paddingInline: 18, boxShadow: 'none' },
        containedPrimary: {
          backgroundColor: BLACK,
          '&:hover': { backgroundColor: BLACK_HOVER, boxShadow: 'none' },
        },
        containedSecondary: {
          backgroundColor: RED,
          '&:hover': { backgroundColor: RED_DARK, boxShadow: 'none' },
        },
        outlinedPrimary: {
          borderColor: BLACK,
          color: BLACK,
          '&:hover': { borderColor: BLACK, backgroundColor: 'rgba(10,10,10,0.05)' },
        },
        outlinedSecondary: {
          borderColor: RED,
          color: RED,
          '&:hover': { borderColor: RED_DARK, backgroundColor: 'rgba(229,35,43,0.06)' },
        },
        textPrimary: { color: BLACK },
        textSecondary: { color: RED },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 0 },
        colorPrimary: { color: BLACK },
        colorSecondary: { color: RED },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', borderRadius: 0 },
        rounded: { borderRadius: 0 },
        elevation: { boxShadow: 'none' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
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
          color: BLACK,
          backgroundImage: 'none',
          borderBottom: `2px solid ${BLACK}`,
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
        root: { color: TEXT_SECONDARY, '&.Mui-selected': { color: RED } },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          backgroundColor: WHITE,
          // Inputs already show focus via the 2px black border; skip the extra ring.
          '& input:focus-visible, & textarea:focus-visible': { outline: 'none' },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cfcfcf' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: BLACK },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BLACK, borderWidth: 2 },
        },
        notchedOutline: { borderRadius: 0 },
      },
    },
    MuiFilledInput: { styleOverrides: { root: { borderRadius: 0 } } },
    MuiInputBase: { styleOverrides: { root: { borderRadius: 0 } } },
    MuiInputLabel: {
      styleOverrides: { root: { '&.Mui-focused': { color: BLACK } } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 0, backgroundColor: '#f0f0f0', color: BLACK },
        colorPrimary: { backgroundColor: BLACK, color: WHITE },
        colorSecondary: { backgroundColor: RED, color: WHITE },
        outlined: { borderColor: BLACK, backgroundColor: 'transparent' },
        outlinedSecondary: { borderColor: RED, color: RED },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { borderRadius: 0, backgroundColor: BLACK, color: WHITE },
        circular: { borderRadius: 0 },
        rounded: { borderRadius: 0 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 0 },
        standardError: { backgroundColor: '#fdecec', color: BLACK, border: `1px solid ${RED}` },
        standardSuccess: { backgroundColor: '#f5f5f5', color: BLACK, border: `1px solid ${BLACK}` },
        standardWarning: { backgroundColor: '#f5f5f5', color: BLACK, border: `1px solid ${BLACK}` },
        standardInfo: { backgroundColor: '#f5f5f5', color: BLACK, border: `1px solid ${BLACK}` },
        filledError: { backgroundColor: RED, color: WHITE },
        filledSuccess: { backgroundColor: BLACK, color: WHITE },
        filledWarning: { backgroundColor: BLACK, color: WHITE },
        filledInfo: { backgroundColor: BLACK, color: WHITE },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 0, border: `2px solid ${BLACK}`, boxShadow: 'none' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 0, border: `1px solid ${BLACK}`, boxShadow: 'none' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': { backgroundColor: 'rgba(229,35,43,0.10)', color: RED },
          '&:hover': { backgroundColor: BLACK, color: WHITE },
        },
      },
    },
    MuiPopover: {
      styleOverrides: { paper: { borderRadius: 0 } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 0, backgroundColor: BLACK, color: WHITE },
        arrow: { color: BLACK },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: { borderRadius: 0, backgroundColor: BLACK, color: WHITE },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 0, backgroundColor: '#ececec' },
        bar: { borderRadius: 0, backgroundColor: RED },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          borderColor: BLACK,
          color: BLACK,
          '&.Mui-selected': { backgroundColor: BLACK, color: WHITE, '&:hover': { backgroundColor: BLACK_HOVER } },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: { borderRadius: 0 },
        grouped: { borderRadius: 0, '&:first-of-type': { borderRadius: 0 }, '&:last-of-type': { borderRadius: 0 } },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          '&.Mui-selected': { backgroundColor: BLACK, color: WHITE, '&:hover': { backgroundColor: BLACK_HOVER } },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${BORDER}` },
        head: { backgroundColor: BLACK, color: WHITE, fontWeight: 700 },
      },
    },
    MuiTableRow: {
      styleOverrides: { root: { '&:hover': { backgroundColor: 'rgba(229,35,43,0.05)' } } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: BORDER } },
    },
    MuiSkeleton: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiBadge: {
      styleOverrides: { badge: { borderRadius: 0, backgroundColor: RED, color: WHITE } },
    },
    MuiTabs: {
      styleOverrides: { indicator: { backgroundColor: RED, height: 3 } },
    },
    MuiTab: {
      styleOverrides: { root: { color: TEXT_SECONDARY, '&.Mui-selected': { color: BLACK } } },
    },
    MuiSwitch: {
      styleOverrides: {
        track: { borderRadius: 0 },
        thumb: { borderRadius: 0 },
        switchBase: { '&.Mui-checked': { color: RED }, '&.Mui-checked + .MuiSwitch-track': { backgroundColor: RED } },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: RED },
        thumb: { borderRadius: 0 },
        track: { borderRadius: 0 },
        rail: { borderRadius: 0 },
      },
    },
    MuiCheckbox: {
      styleOverrides: { root: { color: BLACK, '&.Mui-checked': { color: RED } } },
    },
    MuiRadio: {
      styleOverrides: { root: { color: BLACK, '&.Mui-checked': { color: RED } } },
    },
    MuiLink: {
      styleOverrides: { root: { color: RED } },
    },
    MuiCircularProgress: {
      styleOverrides: { root: { color: RED } },
    },
    MuiFab: {
      styleOverrides: { root: { borderRadius: 0, boxShadow: 'none' } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: 0, '&.Mui-selected': { backgroundColor: 'rgba(229,35,43,0.10)' } },
      },
    },
    MuiAccordion: {
      styleOverrides: { root: { borderRadius: 0, '&:first-of-type, &:last-of-type': { borderRadius: 0 } } },
    },
  },
});

/** Shared colors for macronutrient charts and progress bars. */
export const macroColors = {
  protein: RED,
  carbs: BLACK,
  fat: '#f08f93',
} as const;

/** Accent used for chart bars and lines. */
export const chartAccentColor = RED;

/** Light grey used for chart "target"/empty backgrounds. */
export const chartMutedColor = '#e5e5e5';
