import { useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import {
  DataGrid,
  useGridApiRef,
  gridFilteredSortedRowIdsSelector,
  type GridColDef,
  type GridValidRowModel,
} from '@mui/x-data-grid';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { fmtDate, n, type Selected, type Risk } from './data';
import { downloadCsv, type CsvRow } from './export';

export const colours = ['#9e6b1f', '#486f83', '#779489', '#a8b0b2', '#ba8873', '#7b6d83'];
export const riskColours: Record<Risk, string> = {
  Low: '#779489',
  Moderate: '#bc9853',
  High: '#ad7057',
  Severe: '#9a4e50',
};
export function Info({ text }: { text: string }) {
  return (
    <Tooltip title={text} placement="top" arrow>
      <IconButton aria-label={text} size="small" className="info-icon">
        <InfoOutlinedIcon sx={{ fontSize: 15 }} />
      </IconButton>
    </Tooltip>
  );
}
export function Status({ value }: { value: string }) {
  const tone = /^(Active|Completed|Resolved|Low|Enabled)$/.test(value)
    ? 'good'
    : /^(Warning|Missed|High|Severe)$/.test(value)
      ? 'warn'
      : 'neutral';
  return (
    <Chip
      className={`status status-${tone}`}
      label={
        <>
          <span className="status-dot" />
          {value}
        </>
      }
      size="small"
    />
  );
}
export type Metric = {
  id: string;
  label: string;
  value: string | number;
  note: string;
  icon: ReactNode;
  definition: string;
  previous?: number;
  current?: number;
  onClick?: () => void;
  alert?: boolean;
  progress?: number;
};
export function MetricCard({ metric }: { metric: Metric }) {
  const delta =
    metric.previous && metric.current !== undefined
      ? ((metric.current - metric.previous) / metric.previous) * 100
      : null;
  return (
    <Paper variant="outlined" className={`metric-card ${metric.alert ? 'metric-alert' : ''}`}>
      <ButtonBase
        className="metric-click"
        onClick={metric.onClick}
        disabled={!metric.onClick}
        aria-label={`View ${metric.label} details`}
      >
        <div className="metric-top">
          <span>{metric.label}</span>
        </div>
        <div className="metric-value">
          <span>{typeof metric.value === 'number' ? n(metric.value) : metric.value}</span>
          <span className="metric-symbol">{metric.icon}</span>
        </div>
        {metric.progress !== undefined && (
          <div className="capacity-track">
            <span style={{ width: `${Math.min(metric.progress, 100)}%` }} />
          </div>
        )}
        <div className="metric-bottom">
          {delta !== null ? (
            <>
              <span className={`trend ${delta < 0 ? 'trend-down' : ''}`}>
                {delta >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                {Math.abs(delta).toFixed(1)}%
              </span>
              <span>vs previous period</span>
            </>
          ) : (
            <span>{metric.note}</span>
          )}
        </div>
        <span className="metric-arrow">
          <ArrowForwardIcon sx={{ fontSize: 15 }} />
        </span>
      </ButtonBase>
      <div className="metric-info">
        <Info text={metric.definition} />
      </div>
    </Paper>
  );
}
export function Panel({
  title,
  subtitle,
  children,
  action,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Paper variant="outlined" className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <Typography component="h2" variant="h3">
            {title}
          </Typography>
          {subtitle && (
            <Typography color="text.secondary" variant="caption" component="p" sx={{ mt: 0.75 }}>
              {subtitle}
            </Typography>
          )}
        </div>
        {action}
      </div>
      {children}
    </Paper>
  );
}
export function Empty({ text = 'No recorded evidence in this period.' }: { text?: string }) {
  return (
    <div className="empty-state">
      <InfoOutlinedIcon />
      <Typography>{text}</Typography>
      <Typography variant="caption">Try another date range or fictional customer.</Typography>
    </div>
  );
}
export type Count = { id: number; label: string; value: number };
export function Donut({
  data,
  total,
  label,
  risk = false,
}: {
  data: Count[];
  total: number;
  label: string;
  risk?: boolean;
}) {
  if (!total) return <Empty />;
  return (
    <div className="donut-layout">
      <div className="donut-chart">
        <PieChart
          height={195}
          series={[
            {
              data: data.map((d, i) => ({
                ...d,
                color: risk ? riskColours[d.label as Risk] : colours[i % colours.length],
              })),
              innerRadius: 64,
              outerRadius: 84,
              paddingAngle: 2,
              cornerRadius: 1,
              highlightScope: { fade: 'global', highlight: 'item' },
              valueFormatter: (item) => `${n(item.value)} records`,
            },
          ]}
          hideLegend
          margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <div className="donut-label">
          <strong>{n(total)}</strong>
          <span>{label}</span>
        </div>
      </div>
      <div className="chart-legend">
        {data.map((d, i) => (
          <div key={d.label}>
            <span className="legend-label">
              <i
                style={{
                  background: risk ? riskColours[d.label as Risk] : colours[i % colours.length],
                }}
              />
              {d.label}
            </span>
            <strong>{n(d.value)}</strong>
            <span>{((d.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
export function HorizontalBars({
  data,
  onSelect,
  risk = false,
}: {
  data: Count[];
  onSelect?: (label: string) => void;
  risk?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (!data.length || !data.some((d) => d.value)) return <Empty />;
  return (
    <div className="horizontal-bars">
      {data.slice(0, 6).map((d, i) => (
        <button
          key={d.label}
          className="bar-row"
          onClick={() => onSelect?.(d.label)}
          disabled={!onSelect}
          aria-label={`${d.label}: ${n(d.value)} records`}
        >
          <span className="bar-label">{d.label}</span>
          <span className="bar-track">
            <span
              style={{
                width: `${(d.value / max) * 100}%`,
                background: risk ? riskColours[d.label as Risk] : colours[i % colours.length],
              }}
            />
          </span>
          <strong>{n(d.value)}</strong>
        </button>
      ))}
    </div>
  );
}
export function TimeLines({
  points,
  travel = false,
  alerts = false,
}: {
  points: Array<{
    label: string;
    from: string;
    to: string;
    web: number;
    engaged: number;
    mobile: number;
    trips: number;
    sends: number;
  }>;
  travel?: boolean;
  alerts?: boolean;
}) {
  const keys: Array<'engaged' | 'mobile' | 'web' | 'trips' | 'sends'> = travel
    ? ['trips']
    : alerts
      ? ['sends']
      : ['engaged', 'mobile', 'web'];
  const labels = {
    web: 'Web users',
    engaged: 'Engaged users',
    mobile: 'Mobile users',
    trips: 'Trips / itineraries',
    sends: 'Recorded alert sends',
  };
  return (
    <LineChart
      sx={{
        '& .MuiAreaElement-root': { fillOpacity: 0.12 },
        '& .MuiChartsGrid-line': { stroke: '#ecece7' },
      }}
      height={270}
      xAxis={[
        {
          scaleType: 'point',
          data: points.map((p) => (travel || alerts ? p.label : p.to)),
          valueFormatter:
            travel || alerts
              ? undefined
              : (value, context) => {
                  const bucket = points.find((p) => p.to === value);
                  if (!bucket) return String(value);
                  return context.location === 'tick'
                    ? bucket.label
                    : `${fmtDate(bucket.from)} — ${fmtDate(bucket.to)}`;
                },
          tickLabelStyle: { fontSize: 11 },
        },
      ]}
      yAxis={[{ width: 50, min: 0, tickLabelStyle: { fontSize: 11 } }]}
      series={keys.map((key, i) => ({
        id: key,
        data: points.map((p) => p[key]),
        label: labels[key],
        color: colours[i],
        curve: 'linear',
        showMark: false,
        area: travel || alerts,
        valueFormatter: (v) =>
          travel || alerts ? n(v || 0) : `${n(v || 0)} users with recorded activity`,
      }))}
      grid={{ horizontal: true }}
      margin={{ left: 8, right: 20, top: 22, bottom: 8 }}
      slotProps={{ legend: { position: { vertical: 'bottom', horizontal: 'center' } } }}
    />
  );
}
export function Columns({ data, risk = false }: { data: Count[]; risk?: boolean }) {
  if (!data.some((d) => d.value)) return <Empty />;
  return (
    <BarChart
      height={245}
      xAxis={[
        {
          scaleType: 'band',
          data: data.map((d) => d.label),
          colorMap: {
            type: 'ordinal',
            values: data.map((d) => d.label),
            colors: data.map((d, i) =>
              risk ? riskColours[d.label as Risk] : colours[i % colours.length],
            ),
          },
          tickLabelStyle: { fontSize: 10 },
        },
      ]}
      series={[{ data: data.map((d) => d.value), label: 'Records' }]}
      yAxis={[{ width: 38 }]}
      borderRadius={2}
      margin={{ top: 15, bottom: 10, right: 12 }}
      grid={{ horizontal: true }}
      hideLegend
    />
  );
}
export const dateColumn = (field: string, headerName: string, width = 175): GridColDef => ({
  field,
  headerName,
  width,
  valueFormatter: (value) => fmtDate(value as string | null),
});
export const statusColumn = (field = 'status', headerName = 'Status'): GridColDef => ({
  field,
  headerName,
  width: 150,
  renderCell: (params) => <Status value={String(params.value)} />,
});
export const userColumns: GridColDef[] = [
  { field: 'name', headerName: 'Name', width: 180 },
  { field: 'email', headerName: 'Email', width: 290 },
  { field: 'group', headerName: 'User group', width: 140 },
  { field: 'enabled', headerName: 'Enabled', width: 110, type: 'boolean' },
  dateColumn('lastActivity', 'Last recorded activity', 185),
  { field: 'source', headerName: 'Activity source', width: 170 },
  { field: 'platform', headerName: 'Platform', width: 150 },
  { field: 'mobile', headerName: 'Registered mobile device', width: 195, type: 'boolean' },
  { field: 'age', headerName: 'Engagement age band', width: 185 },
];
export const tripColumns: GridColDef[] = [
  { field: 'traveller', headerName: 'Traveller', width: 180 },
  { field: 'booking', headerName: 'Booking reference', width: 155 },
  dateColumn('start', 'Start', 130),
  dateColumn('end', 'End', 130),
  { field: 'origin', headerName: 'Origin', width: 135 },
  { field: 'destination', headerName: 'Destination', width: 145 },
  { field: 'region', headerName: 'Region', width: 160 },
  statusColumn('risk', 'Risk'),
  { field: 'provider', headerName: 'Provider', width: 145 },
];
export const checkColumns: GridColDef[] = [
  { field: 'traveller', headerName: 'Traveller', width: 180 },
  dateColumn('requested', 'Requested'),
  dateColumn('completed', 'Completed'),
  statusColumn(),
  { field: 'location', headerName: 'Location', width: 140 },
];
export const sosColumns: GridColDef[] = [
  { field: 'traveller', headerName: 'Traveller', width: 180 },
  dateColumn('time', 'Time'),
  { field: 'location', headerName: 'Location', width: 145 },
  statusColumn(),
  { field: 'acknowledgement', headerName: 'Acknowledgement', minWidth: 280, flex: 1 },
];
export const alertColumns: GridColDef[] = [
  { field: 'alert', headerName: 'Alert', minWidth: 280, flex: 1 },
  statusColumn('risk', 'Risk'),
  { field: 'type', headerName: 'Type', width: 145 },
  { field: 'recipientCount', headerName: 'Recipients / sends', width: 160, type: 'number' },
  dateColumn('date', 'Date/time'),
];
export function csvRows(rows: GridValidRowModel[], columns: GridColDef[]): CsvRow[] {
  return rows.map(
    (row) =>
      Object.fromEntries(
        columns.map((c) => [
          c.headerName || c.field,
          Array.isArray(row[c.field]) ? row[c.field].join('; ') : (row[c.field] ?? ''),
        ]),
      ) as CsvRow,
  );
}
export const alertRows = (data: Selected) =>
  data.alerts.map((a) => ({ ...a, recipientCount: a.recipients.length }));
export function Records({
  title,
  subtitle,
  rows,
  columns,
  filename,
  initialFilter = '',
  choices,
  filterField,
  compact = false,
  onRow,
}: {
  title: string;
  subtitle?: string;
  rows: GridValidRowModel[];
  columns: GridColDef[];
  filename: string;
  initialFilter?: string;
  choices?: string[];
  filterField?: string;
  compact?: boolean;
  onRow?: (row: GridValidRowModel) => void;
}) {
  const apiRef = useGridApiRef();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(initialFilter || 'All');
  const filtered = rows.filter(
    (row) =>
      (filter === 'All' || !filterField || String(row[filterField]) === filter) &&
      columns.some((c) =>
        String(row[c.field] ?? '')
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
  );
  const exportRows = () => {
    const visibleIds = gridFilteredSortedRowIdsSelector(apiRef);
    const visibleRows = visibleIds
      .map((id) => apiRef.current!.getRow(id))
      .filter(Boolean) as GridValidRowModel[];
    downloadCsv(
      filename,
      csvRows(visibleRows, columns),
      columns.map((c) => c.headerName || c.field),
    );
  };
  return (
    <Panel
      title={title}
      subtitle={subtitle}
      className={compact ? 'compact-records' : ''}
      action={
        <Button
          variant="outlined"
          size="small"
          startIcon={<FileDownloadOutlinedIcon />}
          onClick={exportRows}
          aria-label={`Export ${title}`}
        >
          Export CSV
        </Button>
      }
    >
      {!compact && (
        <div className="table-tools">
          <TextField
            size="small"
            placeholder="Search records…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': `Search ${title}` },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          {choices && filterField && (
            <TextField
              select
              label="Filter"
              value={filter}
              size="small"
              onChange={(e) => setFilter(e.target.value)}
              sx={{ minWidth: 190 }}
            >
              {['All', ...choices].map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {n(filtered.length)} records
          </Typography>
        </div>
      )}
      <Box sx={{ height: compact ? 335 : 460, width: '100%' }}>
        <DataGrid
          apiRef={apiRef}
          rows={filtered}
          columns={columns}
          rowHeight={46}
          columnHeaderHeight={43}
          disableRowSelectionOnClick
          pageSizeOptions={compact ? [5] : [10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: compact ? 5 : 10 } } }}
          slots={{
            noRowsOverlay: () => (
              <Empty text={search || filter !== 'All' ? 'No matching records.' : undefined} />
            ),
          }}
          onRowClick={onRow ? (params) => onRow(params.row) : undefined}
          onCellKeyDown={
            onRow
              ? (params, event) => {
                  if (event.key === 'Enter') onRow(params.row);
                }
              : undefined
          }
          sx={onRow ? { '& .MuiDataGrid-row': { cursor: 'pointer' } } : undefined}
        />
      </Box>
    </Panel>
  );
}
