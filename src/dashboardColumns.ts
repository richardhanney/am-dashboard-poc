import type { GridColDef } from '@mui/x-data-grid';
export const profileColumns: GridColDef[] = [
  { field: 'name', headerName: 'Name' },
  { field: 'email', headerName: 'Email' },
  { field: 'currentStatus', headerName: 'Current account status' },
  { field: 'createdAt', headerName: 'Profile created (UTC)' },
];
export const userColumns: GridColDef[] = [
  { field: 'name', headerName: 'Name' },
  { field: 'email', headerName: 'Email' },
  { field: 'currentStatus', headerName: 'Current account status' },
  { field: 'lastActivity', headerName: 'Latest evidence in window (UTC)' },
  { field: 'platforms', headerName: 'Recorded platforms' },
];
export const tripColumns: GridColDef[] = [
  { field: 'traveller', headerName: 'Name' },
  { field: 'email', headerName: 'Email' },
  { field: 'booking', headerName: 'Booking reference(s)' },
  { field: 'start', headerName: 'Start (UTC)' },
  { field: 'end', headerName: 'End (UTC)' },
  { field: 'origin', headerName: 'Origin' },
  { field: 'destination', headerName: 'Recorded destinations' },
];
export const sosColumns: GridColDef[] = [
  { field: 'traveller', headerName: 'Name' },
  { field: 'email', headerName: 'Email' },
  { field: 'time', headerName: 'Recorded at (UTC)' },
  { field: 'country', headerName: 'Recorded country' },
];
export const receivedColumns = sosColumns;
export const nearbyAlertColumns: GridColDef[] = [
  { field: 'alert', headerName: 'Alert' },
  { field: 'date', headerName: 'Created (UTC)' },
  { field: 'eventStart', headerName: 'Event start (UTC)' },
  { field: 'eventEnd', headerName: 'Event end (UTC)' },
  { field: 'risk', headerName: 'Risk' },
  { field: 'type', headerName: 'Category' },
  { field: 'location', headerName: 'Recorded location' },
  { field: 'country', headerName: 'Country' },
  { field: 'nearbyUsers', headerName: 'Nearby users' },
  { field: 'nearbyFacilities', headerName: 'Nearby facilities' },
];
