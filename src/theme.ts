import { createTheme } from '@mui/material/styles';
import '@mui/x-data-grid/themeAugmentation';

const fieldFontSize = 13;

export const theme = createTheme({
  palette: {
    primary: { main: '#007dbb', dark: '#00496d' },
    secondary: { main: '#102231' },
    background: { default: '#f5f7fb', paper: '#ffffff' },
    text: { primary: '#172033', secondary: '#5b6476' },
    divider: '#d7deea',
    success: { main: '#1b8a5a' },
    warning: { main: '#a27224' },
    error: { main: '#a54e4e' },
    info: { main: '#486f83' },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    h1: { fontFamily: "'DM Serif Text', serif", fontSize: '2.5rem', fontWeight: 400 },
    h2: { fontFamily: "'DM Serif Text', serif", fontSize: '2rem', fontWeight: 400 },
    h3: { fontFamily: "'DM Serif Text', serif", fontSize: '1.75rem', fontWeight: 400 },
    body1: { fontSize: '.95rem' },
    body2: { fontSize: '.875rem' },
    button: { textTransform: 'none', fontWeight: 600 },
    caption: { fontSize: '.75rem' },
  },
  shape: { borderRadius: 8 },
  spacing: 8,
  breakpoints: { values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1600 } },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none', minHeight: 36, boxShadow: 'none' },
        outlined: { borderColor: '#babcb9', color: '#172033' },
      },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 8 } } },
    // The floating label and outline legend must use the same base font size.
    MuiInputLabel: { styleOverrides: { root: { fontSize: fieldFontSize } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: '#fff',
          fontSize: fieldFontSize,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cdcfcb' },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          minHeight: 48,
          padding: '12px 20px',
          fontWeight: 500,
          fontSize: 13,
        },
      },
    },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiDataGrid: {
      styleOverrides: {
        root: { border: 0, fontSize: 12, '--DataGrid-containerBackground': '#f8f8f6' },
        columnHeaderTitle: { fontWeight: 600 },
        cell: { borderColor: '#efefeb' },
      },
    },
  },
});
