import { createTheme } from '@mui/material/styles';
import '@mui/x-data-grid/themeAugmentation';

export const theme = createTheme({
  palette: {
    primary: { main: '#9e6b1f', dark: '#7c5418' },
    secondary: { main: '#102231' },
    background: { default: '#fafaf9', paper: '#ffffff' },
    text: { primary: '#172033', secondary: '#626971' },
    divider: '#e4e4e0',
    success: { main: '#427768' },
    warning: { main: '#a27224' },
    error: { main: '#a54e4e' },
    info: { main: '#486f83' },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    h1: { fontFamily: "'Lora', serif", fontSize: '2rem', fontWeight: 500 },
    h2: { fontFamily: "'Lora', serif", fontSize: '1.4rem', fontWeight: 500 },
    h3: { fontFamily: "'Lora', serif", fontSize: '1.1rem', fontWeight: 500 },
    body1: { fontSize: '.875rem' },
    body2: { fontSize: '.8rem' },
    button: { textTransform: 'none', fontWeight: 600 },
    caption: { fontSize: '.72rem' },
  },
  shape: { borderRadius: 5 },
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
    MuiIconButton: { styleOverrides: { root: { borderRadius: 5 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: '#fff',
          fontSize: 13,
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
