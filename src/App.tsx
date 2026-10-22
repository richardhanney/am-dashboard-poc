import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Checkbox,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { differenceInCalendarDays, isValid, parseISO, subDays } from 'date-fns';
import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LinkIcon from '@mui/icons-material/Link';
import {
  AGE_BANDS,
  customers,
  fmtDate,
  groupCounts,
  n,
  presetRange,
  previousRange,
  selectData,
  timeline,
  type Range,
} from './data';
import {
  alertColumns,
  alertRows,
  checkColumns,
  Columns,
  csvRows,
  Donut,
  HorizontalBars,
  Info,
  MetricCard,
  Panel,
  Records,
  sosColumns,
  Status,
  TimeLines,
  tripColumns,
  userColumns,
  profileColumns,
  type Metric,
} from './components';
import { downloadCsv, type CsvRow } from './export';
import AccountCapacity from './AccountCapacity';
import UsageConcepts from './AdditionalUsage';
import IntegrationRegister from './IntegrationRegister';
import ReportCenter from './ReportCenter';
import { advanceSimulation, demoClock, initialSimulation } from './simulation';
import {
  captureReport,
  ExportContext,
  withExportScope,
  type ExportScope,
  type ReportSnapshot,
} from './reporting';
import CelebrateButton from './CelebrateButton';

const TravellerFootprint = lazy(() => import('./TravellerFootprint'));

const tabs = ['Overview', 'Users', 'Travel', 'Safety & Alerts', 'Integrations'];
const defaultLayout = ['enabled', 'limit', 'created', 'engaged', 'mobile', 'trips'];
type Layout = { order: string[]; hidden: string[] };
function loadLayout(): Layout {
  try {
    const value = JSON.parse(localStorage.getItem('serenity-poc-layout-v1') || 'null');
    if (
      value &&
      Array.isArray(value.order) &&
      value.order.length >= 5 &&
      new Set(value.order).size === value.order.length &&
      value.order.every((id: string) => defaultLayout.includes(id)) &&
      Array.isArray(value.hidden) &&
      value.hidden.every((id: string) => defaultLayout.includes(id))
    )
      return {
        ...value,
        order: [...value.order, ...defaultLayout.filter((id) => !value.order.includes(id))],
      };
  } catch {
    /* Storage may be unavailable in a private browser. */
  }
  return { order: defaultLayout, hidden: [] };
}
type Detail = {
  scope?: ExportScope;
  title: string;
  description: string;
  rows?: GridValidRowModel[];
  columns?: GridColDef[];
  content?: ReactNode;
  filename?: string;
  onRow?: (row: GridValidRowModel) => void;
};

export default function App() {
  const [customerId, setCustomerId] = useState('acme');
  const [tab, setTab] = useState(0);
  const [safetyTab, setSafetyTab] = useState(0);
  const [reportRange, setRange] = useState<Range>(presetRange(3));
  const [simulation, setSimulation] = useState(initialSimulation);
  const [live, setLive] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [reportSnapshot, setReportSnapshot] = useState<ReportSnapshot | null>(null);
  const [editingContact, setEditingContact] = useState(false);
  const [allocations, setAllocations] = useState<
    Record<string, { limit: number | null; threshold: number }>
  >(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('serenity-allocation-v1') || '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch {
      return {};
    }
  });
  const range = useMemo(
    () =>
      live ? { from: simulation.now.slice(0, 10), to: simulation.now.slice(0, 10) } : reportRange,
    [live, simulation.now, reportRange],
  );
  const [draftFrom, setDraftFrom] = useState<Date | null>(parseISO(range.from));
  const [draftTo, setDraftTo] = useState<Date | null>(parseISO(range.to));
  const [preset, setPreset] = useState<number | null>(3);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [customise, setCustomise] = useState(false);
  const [layout, setLayout] = useState<Layout>(loadLayout);
  const [toast, setToast] = useState('');
  const running =
    (live || autoRefresh) && !detail && !customise && !reportSnapshot && !editingContact;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(
      () => setSimulation((state) => advanceSimulation(state, customerId)),
      live ? 4000 : 8000,
    );
    return () => window.clearInterval(timer);
  }, [running, live, customerId]);
  const updated = demoClock(simulation.now);
  const customer = simulation.customers.find((c) => c.id === customerId)!;
  const storedAllocation = allocations[customerId];
  const allocation =
    storedAllocation &&
    (storedAllocation.limit === null ||
      (Number.isInteger(storedAllocation.limit) && storedAllocation.limit >= 0))
      ? storedAllocation.limit
      : customer.limit;
  const threshold =
    storedAllocation && [80, 85, 90, 95].includes(storedAllocation.threshold)
      ? storedAllocation.threshold
      : 85;
  const data = useMemo(() => selectData(customer, range), [customer, range]);
  const previous = useMemo(() => selectData(customer, previousRange(range)), [customer, range]);
  const points = useMemo(() => timeline(customer, range), [customer, range]);
  const recent = [...data.engaged]
    .sort((a, b) => (b.lastActivity || '').localeCompare(a.lastActivity || ''))
    .slice(0, 5);
  const prefix = `${customer.id}-${range.from}-${range.to}`;
  const percent =
    allocation === null
      ? 0
      : allocation === 0
        ? data.enabled.length
          ? 100
          : 0
        : (data.enabled.length / allocation) * 100;
  const exportScope = {
    customer: customer.name,
    ...range,
    asOf: simulation.now,
    snapshotId: `${customer.id}-r${simulation.revision}`,
  };
  const downloadSnapshotCsv = (name: string, rows: CsvRow[], columns?: string[]) => {
    const scoped = withExportScope(rows, exportScope);
    downloadCsv(`${name}-${exportScope.snapshotId}`, scoped, [
      ...new Set([...(columns || []), ...scoped.flatMap((row) => Object.keys(row))]),
    ]);
  };
  const receivedColumns: GridColDef[] = [
    { field: 'traveller', headerName: 'Traveller', width: 180 },
    { field: 'email', headerName: 'Email', width: 260 },
    { field: 'time', headerName: 'Received at', width: 180 },
    { field: 'location', headerName: 'Location', width: 150 },
    { field: 'source', headerName: 'Receipt source', width: 180 },
    { field: 'requestId', headerName: 'Linked request', width: 190 },
  ];
  const ingestionColumns: GridColDef[] = [
    { field: 'provider', headerName: 'Provider', width: 160 },
    { field: 'time', headerName: 'Accepted at', width: 180 },
    { field: 'booking', headerName: 'Booking reference', width: 190 },
    { field: 'status', headerName: 'Status', width: 120 },
  ];
  const accountFocus =
    allocation === null
      ? `${customer.name} has ${n(data.enabled.length)} enabled accounts. A configured user limit has not been set. ${customer.focus}`
      : `${customer.name} has ${n(data.enabled.length)} enabled accounts against a configured limit of ${allocation === null ? 'not configured' : n(allocation)}. ${customer.focus}`;
  const file = (kind: string) => `${prefix}-${kind}-MOCK`;
  const openRecords = (
    title: string,
    description: string,
    rows: GridValidRowModel[],
    columns: GridColDef[],
    kind: string,
    onRow?: (row: GridValidRowModel) => void,
  ) =>
    setDetail({
      title,
      scope: exportScope,
      description: `${description} Captured snapshot ${exportScope.snapshotId} · data as of ${updated}. Live simulation pauses while these records are open.`,
      rows,
      columns,
      filename: file(kind),
      onRow,
    });
  const showUsers = (
    rows = data.engaged,
    title = `${n(rows.length)} engaged users`,
    description = 'Distinct fictional users with recorded engagement during the selected period. Registration alone is not engagement.',
  ) => openRecords(title, description, rows, userColumns, 'user-engagement');
  const showTrips = (rows = data.trips, title = `${n(rows.length)} trips / itineraries`) =>
    openRecords(
      title,
      'One mock itinerary per booking reference, counted by start date. Itinerary segments are not counted separately. Distinct travellers are deduplicated by fictional user ID.',
      rows,
      tripColumns,
      'travel',
    );
  const showChecks = () =>
    openRecords(
      `${n(data.checkins.length)} check-in records`,
      'Each requested check-in is one record. Response rate = completed / all requests, including missed and pending. This is not an alert delivery measure.',
      data.checkins,
      checkColumns,
      'check-ins',
    );
  const showSos = () =>
    openRecords(
      `${n(data.sos.length)} SOS records`,
      'Fabricated assistance records and acknowledgement states. No emergency service is contacted.',
      data.sos,
      sosColumns,
      'sos',
    );
  const showRecipients = (row: GridValidRowModel) => {
    const users = data.users.filter((u) => (row.recipients as string[]).includes(u.id));
    openRecords(
      `${n(users.length)} mock recipients`,
      `${String(row.alert)} · ${fmtDate(String(row.date))}. One recorded send per recipient in this prototype; no delivery or read status is claimed.`,
      users,
      userColumns.slice(0, 3),
      'alert-recipients',
    );
  };
  const showAlerts = () =>
    openRecords(
      `${n(data.sends)} recorded alert sends`,
      `${n(data.alerts.length)} fictional alerts to ${n(data.recipients)} unique recipients. Recipients can appear in more than one alert. Select an alert row to see the recipients.`,
      alertRows(data),
      alertColumns,
      'alerts',
      showRecipients,
    );
  const capacity = () =>
    setDetail({
      title: 'Configured account capacity',
      description:
        'Illustrative configuration only. This is not a purchased licence count or a billing measure.',
      content: (
        <>
          <Typography variant="h2">
            {n(data.enabled.length)} / {allocation === null ? 'Not configured' : n(allocation)}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.min(percent, 100)}
            sx={{ my: 3, height: 8, borderRadius: 1 }}
          />
          <Typography>
            {percent.toFixed(1)}% of configured capacity ·{' '}
            {allocation === null
              ? 'Not configured'
              : n(Math.max(0, allocation - data.enabled.length))}{' '}
            accounts of headroom
          </Typography>
          <Alert severity="info" sx={{ mt: 3 }}>
            Commercial 365-day active-user definition to be validated separately.
          </Alert>
        </>
      ),
    });
  const metrics: Record<string, Metric> = {
    enabled: {
      id: 'enabled',
      label: 'Enabled accounts',
      value: data.enabled.length,
      icon: <PeopleOutlineIcon />,
      note: `Current mock snapshot · ${simulation.now.slice(0, 10)}`,
      definition:
        'Accounts enabled in the current fictional snapshot, independent of selected reporting dates. Historical enabled-account state is not reconstructed. Enabled status is not commercial active-user status.',
      onClick: () =>
        showUsers(
          data.enabled,
          `${n(data.enabled.length)} enabled accounts`,
          'Fictional accounts enabled in the current snapshot, independent of selected reporting dates. Enabled status does not establish recorded engagement or commercial active-user status.',
        ),
    },
    limit: {
      id: 'limit',
      label: 'Configured user limit',
      value: allocation ?? 'Not configured',
      icon: <VerifiedUserOutlinedIcon />,
      note:
        allocation === null
          ? 'Allocation not configured'
          : `${percent.toFixed(1)}% configured capacity used`,
      definition: 'A fictional configured user limit. No purchased licence count is claimed.',
      onClick: capacity,
      progress: allocation === null ? undefined : percent,
    },
    created: {
      id: 'created',
      label: 'Profiles created',
      value: data.created.length,
      icon: <PeopleOutlineIcon />,
      note: 'Created in selected period',
      definition:
        'Distinct fictional profiles by creation timestamp in the selected period. Creation is separate from enabled status, engagement and commercial billing.',
      previous: previous.created.length,
      current: data.created.length,
      onClick: () => showGrowth(),
    },
    engaged: {
      id: 'engaged',
      label: 'Engaged users',
      value: data.engaged.length,
      icon: <PersonOutlineIcon />,
      note: 'Recorded in selected period',
      definition:
        'Distinct users with at least one recorded web sign-in or mobile session in the selected period. Not a billing-grade metric.',
      previous: previous.engaged.length,
      current: data.engaged.length,
      onClick: () => showUsers(),
    },
    mobile: {
      id: 'mobile',
      label: 'Mobile users',
      value: data.mobile.length,
      icon: <SmartphoneIcon />,
      note: 'Recorded mobile engagement',
      definition:
        'Distinct users with recorded iOS or Android engagement during the selected period. Registration alone is not engagement and does not establish a currently installed or active app.',
      previous: previous.mobile.length,
      current: data.mobile.length,
      onClick: () =>
        showUsers(data.mobile, `${n(data.mobile.length)} users with recorded mobile engagement`),
    },
    trips: {
      id: 'trips',
      label: 'Trips / itineraries',
      value: data.trips.length,
      icon: <FlightTakeoffIcon />,
      note: 'Counted by itinerary start date',
      definition:
        'Distinct mock booking references starting in the period; one itinerary per booking, not one per flight segment.',
      previous: previous.trips.length,
      current: data.trips.length,
      onClick: () => showTrips(),
    },
  };
  const operations: Metric[] = [
    {
      id: 'checks',
      label: 'Check-in requests sent',
      value: data.checkins.length,
      icon: <CheckCircleOutlineIcon />,
      note: `${n(data.completed)} completed`,
      definition:
        'All mock check-in requests in the selected period, including completed, missed and pending.',
      onClick: showChecks,
    },
    {
      id: 'sos',
      label: 'SOS records',
      value: data.sos.length,
      icon: <WarningAmberIcon />,
      note: 'Recorded assistance requests',
      definition: 'Recorded mock assistance requests. Each row is one SOS record.',
      onClick: showSos,
      alert: true,
    },
    {
      id: 'alerts',
      label: 'Recorded alert sends',
      value: data.sends,
      icon: <NotificationsNoneIcon />,
      note: `${n(data.alerts.length)} alerts · ${n(data.recipients)} unique recipients`,
      definition: 'Sum of mock recipient sends across alerts. Does not imply delivery or reading.',
      onClick: showAlerts,
    },
    {
      id: 'response',
      label: 'Check-in response rate',
      value: data.responseRate === null ? '—' : `${data.responseRate.toFixed(1)}%`,
      icon: <VerifiedUserOutlinedIcon />,
      note: 'Completed / all requested',
      definition:
        'Completed check-ins divided by all requests, including pending and missed. Zero requests has no rate.',
      onClick: showChecks,
    },
    {
      id: 'received',
      label: 'Check-ins received',
      value: data.receivedCheckins.length,
      icon: <CheckCircleOutlineIcon />,
      note: 'Counted by receipt time',
      definition:
        'Received check-in events in the selected period, including scheduled responses and traveller-initiated records. This is separate from requests sent and the request-cohort response rate.',
      onClick: () =>
        openRecords(
          'Received check-ins',
          'Counted by receipt time. A received event can be unscheduled. Request-cohort response rate is calculated separately.',
          data.receivedCheckins,
          receivedColumns,
          'received-checkins',
        ),
    },
  ];
  const user30 = useMemo(
    () =>
      selectData(customer, { from: formatDate(subDays(parseISO(range.to), 29)), to: range.to })
        .engaged,
    [customer, range.to],
  );
  const user90 = useMemo(
    () =>
      selectData(customer, { from: formatDate(subDays(parseISO(range.to), 89)), to: range.to })
        .engaged,
    [customer, range.to],
  );
  const dateError =
    !draftFrom || !draftTo || !isValid(draftFrom) || !isValid(draftTo)
      ? 'Enter two valid dates.'
      : draftFrom > draftTo
        ? 'From date must be on or before To date.'
        : formatDate(draftFrom) < '2025-10-08' || formatDate(draftTo) > simulation.now.slice(0, 10)
          ? `Choose dates between 08 Oct 2025 and ${simulation.now.slice(0, 10)}.`
          : '';
  const applyDate = (from: Date | null, to: Date | null) => {
    setLive(false);
    setPreset(null);
    if (
      from &&
      to &&
      isValid(from) &&
      isValid(to) &&
      from <= to &&
      formatDate(from) >= '2025-10-08' &&
      formatDate(to) <= simulation.now.slice(0, 10)
    )
      setRange({ from: formatDate(from), to: formatDate(to) });
  };
  const changePreset = (months: number) => {
    setLive(false);
    setSavedRange(null);
    const next = presetRange(months);
    setRange(next);
    setDraftFrom(parseISO(next.from));
    setDraftTo(parseISO(next.to));
    setPreset(months);
  };
  const saveLayout = (next: Layout) => {
    setLayout(next);
    try {
      localStorage.setItem('serenity-poc-layout-v1', JSON.stringify(next));
    } catch {
      setToast('Layout updated for this session. Browser storage is unavailable.');
    }
  };
  const moveCard = (i: number, delta: number) => {
    const order = [...layout.order];
    [order[i], order[i + delta]] = [order[i + delta], order[i]];
    saveLayout({ ...layout, order });
  };
  const refresh = () => {
    setSimulation((state) => advanceSimulation(state, customerId));
    setToast(
      'One fictional event recorded locally; matching metrics and receipts updated. No external data requested.',
    );
  };
  const toggleLive = () => {
    setAutoRefresh(false);
    if (live) {
      setRange(range);
      setDraftFrom(parseISO(range.from));
      setDraftTo(parseISO(range.to));
      setLive(false);
    } else {
      if (!savedRange) setSavedRange(range);
      setPreset(null);
      setLive(true);
      setSimulation((state) => advanceSimulation(state, customerId));
    }
  };
  const showGrowth = () =>
    openRecords(
      `${n(data.created.length)} profiles created`,
      'Profiles created in the selected period. Creation date and source are separate from account status, engagement and commercial billing.',
      data.created,
      profileColumns,
      'profiles-created',
    );
  const allocationPanel = (
    <AccountCapacity
      key={customer.id}
      data={data}
      allocation={allocation}
      threshold={threshold}
      onEnabled={() =>
        showUsers(
          data.enabled,
          'Enabled accounts',
          'Current enabled-account snapshot; independent of reporting dates.',
        )
      }
      onDisabled={() =>
        showUsers(
          data.disabled,
          'Disabled accounts',
          'Current disabled-account snapshot; this does not establish commercial inactivity.',
        )
      }
      onSave={(limit, threshold) => {
        const next = { ...allocations, [customerId]: { limit, threshold } };
        setAllocations(next);
        try {
          localStorage.setItem('serenity-allocation-v1', JSON.stringify(next));
          setToast('Fictional allocation saved in this browser.');
        } catch {
          setToast('Fictional allocation saved for this session only.');
        }
      }}
    />
  );
  const exportSummary = () => {
    const rows: CsvRow[] = [
      { Metric: 'Data classification', Value: 'FABRICATED EVENT PROTOTYPE' },
      { Metric: 'Customer', Value: customer.name },
      { Metric: 'From', Value: range.from },
      { Metric: 'To', Value: range.to },
      ...Object.values(metrics).map((m) => ({ Metric: m.label, Value: m.value })),
      ...operations.map((m) => ({ Metric: m.label, Value: m.value })),
      { Metric: 'Profiles created', Value: data.created.length },
      { Metric: 'Disabled accounts', Value: data.disabled.length },
      { Metric: 'Check-ins received', Value: data.receivedCheckins.length },
      { Metric: 'Accepted PNR ingestions', Value: data.ingestions.length },
      { Metric: 'Unique alert recipients', Value: data.recipients },
      { Metric: 'Distinct travellers', Value: data.travellers },
      { Metric: 'Higher-risk trips', Value: data.highRisk.length },
      {
        Metric: 'Commercial definition',
        Value: '365-day active-user definition to be validated separately',
      },
    ];
    downloadSnapshotCsv(file('summary'), rows);
    setToast('Mock summary CSV exported.');
  };
  const activeIntegrations = customer.integrations.filter((i) => i.status === 'Active');
  const integrationsNeedingAttention = customer.integrations.filter(
    (i) => i.status === 'Warning',
  ).length;
  const recentColumns = [userColumns[0], userColumns[4], userColumns[5]];
  const destinationClick = (label: string) =>
    showTrips(
      data.trips.filter((t) => t.destination === label),
      `Trips to ${label}`,
    );
  const railItems = [
    {
      label: 'Account review notes',
      icon: <ChatBubbleOutlineIcon />,
      click: () =>
        setDetail({
          title: 'Account review notes',
          description: `${customer.name} · fictional account review`,
          content: (
            <>
              <Typography>{accountFocus}</Typography>
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Suggested next step: schedule a mock account review, demonstrate the engagement
                receipts, and agree a follow-up action. No message is sent by this prototype.
              </Typography>
            </>
          ),
        }),
    },
    {
      label: 'Metric definitions',
      icon: <MenuBookIcon />,
      click: () =>
        setDetail({
          title: 'Metric definitions',
          description:
            'Recorded evidence supports account conversations. Commercial definitions require separate validation.',
          content: (
            <div className="definitions">
              {[...Object.values(metrics), ...operations].map((m) => (
                <div key={m.id}>
                  <Typography fontWeight={600}>{m.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {m.definition}
                  </Typography>
                </div>
              ))}
            </div>
          ),
        }),
    },
  ];
  return (
    <ExportContext.Provider value={exportScope}>
      <a className="skip-link" href="#main">
        Skip to dashboard
      </a>
      <header className="app-header">
        <button className="brand" onClick={() => setTab(0)} aria-label="Serenity Local overview">
          <img src={`${import.meta.env.BASE_URL}serenity-brand.svg`} alt="Serenity Local" />
        </button>
        <div className="brand-divider" />
        <span className="platform-label">HULA</span>
        <span className="prototype-tag">EVENT PROTOTYPE · MOCK DATA</span>
        <button
          className="profile"
          onClick={() =>
            setDetail({
              title: 'Demo account manager',
              description: 'Alex Morgan · Client Success',
              content: (
                <Typography>
                  This fictional signed-in identity is for demonstration only. All customer and user
                  records are fabricated. There is no authentication or account connection.
                </Typography>
              ),
            })
          }
        >
          <Avatar
            sx={{ width: 31, height: 31, bgcolor: '#d9cab1', color: '#102231', fontSize: 12 }}
          >
            AM
          </Avatar>
          <span>
            <strong>Alex Morgan</strong>
            <small>Client Success</small>
          </span>
          <KeyboardArrowDownIcon fontSize="small" />
        </button>
      </header>
      <nav className="rail" aria-label="Account tools">
        {railItems.map((item, i) => (
          <div key={item.label} className={i === 0 ? 'rail-separated' : ''}>
            <Tooltip title={item.label} placement="right">
              <IconButton aria-label={item.label} onClick={item.click}>
                {item.icon}
              </IconButton>
            </Tooltip>
          </div>
        ))}
        <CelebrateButton />
        <div className="rail-bottom">
          <Tooltip title="About this prototype" placement="right">
            <IconButton
              aria-label="About this prototype"
              onClick={() =>
                setDetail({
                  title: 'About this prototype',
                  description: 'Serenity Local / HULA · Account Management event POC',
                  content: (
                    <>
                      <Typography>
                        100% fabricated dashboard data. No backend, customer/provider APIs or real
                        customer data. The map uses bundled geography with no external map requests.
                      </Typography>
                      <Typography sx={{ mt: 2 }}>
                        The baseline is 07 Oct 2026. Live and Auto-refresh generate fictional
                        records in this browser. No live data is fetched. Mock allocations, contact
                        notes, layout preferences and schedule configurations can be saved locally.
                      </Typography>
                      <img
                        className="help-easter-egg"
                        src={`${import.meta.env.BASE_URL}help-easter-egg.gif`}
                        alt="A playful office reaction"
                        width={400}
                        height={240}
                      />
                    </>
                  ),
                })
              }
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </div>
      </nav>
      <main id="main" className="dashboard">
        <div className="page-heading">
          <div>
            <div className="eyebrow">ACCOUNT MANAGEMENT / CLIENT SUCCESS</div>
            <Typography variant="h1" component="h1">
              Client Engagement
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.8 }}>
              Overview of client usage, engagement and value.
            </Typography>
          </div>
          <div className="heading-actions">
            {tab === 0 && (
              <Button
                variant="outlined"
                startIcon={<TuneIcon />}
                onClick={() => setCustomise(true)}
              >
                Customise dashboard
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={() =>
                setReportSnapshot(
                  captureReport(customer, range, simulation.now, simulation.revision, allocation),
                )
              }
            >
              Export Report
            </Button>
          </div>
        </div>
        <Paper variant="outlined" className="filter-bar">
          <TextField
            select
            label="Customer"
            size="small"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setDetail(null);
              setToast(
                `${customers.find((c) => c.id === e.target.value)!.name} mock records loaded.`,
              );
            }}
            className="customer-select"
          >
            {customers.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <DesktopDatePicker
            label="From date"
            value={live ? parseISO(range.from) : draftFrom}
            onChange={(date) => {
              setDraftFrom(date);
              const to = live ? parseISO(range.to) : draftTo;
              if (live) setDraftTo(to);
              applyDate(date, to);
            }}
            minDate={parseISO('2025-10-08')}
            maxDate={parseISO(simulation.now.slice(0, 10))}
            format="dd/MM/yyyy"
            enableAccessibleFieldDOMStructure={false}
            slotProps={{ textField: { size: 'small', className: 'date-field' } }}
          />
          <DesktopDatePicker
            label="To date"
            value={live ? parseISO(range.to) : draftTo}
            onChange={(date) => {
              setDraftTo(date);
              const from = live ? parseISO(range.from) : draftFrom;
              if (live) setDraftFrom(from);
              applyDate(from, date);
            }}
            minDate={parseISO('2025-10-08')}
            maxDate={parseISO(simulation.now.slice(0, 10))}
            format="dd/MM/yyyy"
            enableAccessibleFieldDOMStructure={false}
            slotProps={{ textField: { size: 'small', className: 'date-field' } }}
          />
          <div className="date-presets">
            {[1, 3, 6, 12].map((months) => (
              <Button
                key={months}
                variant={preset === months ? 'contained' : 'text'}
                onClick={() => changePreset(months)}
                aria-pressed={preset === months}
              >
                {months} {months === 1 ? 'Month' : 'Months'}
              </Button>
            ))}
          </div>
          <div className="live-controls">
            <Button
              variant={live ? 'contained' : 'outlined'}
              aria-pressed={live}
              onClick={toggleLive}
              title="Run fictional updates every four seconds on the demo day. No real data or APIs."
            >
              {live ? 'Pause live' : 'Live'}
            </Button>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={autoRefresh}
                  disabled={live}
                  onChange={(_, value) => setAutoRefresh(value)}
                />
              }
              label="Auto-refresh"
            />
          </div>
          <div className="refresh-group">
            <div>
              <span>Mock data as of</span>
              <strong>{updated}</strong>
            </div>
            <Tooltip title="Refresh mock snapshot locally">
              <Button
                aria-label="Refresh"
                variant="outlined"
                onClick={refresh}
                className="refresh-button"
              >
                <RefreshIcon sx={{ fontSize: 19 }} />
              </Button>
            </Tooltip>
          </div>
        </Paper>
        {dateError && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {dateError} The dashboard retains the last valid range.
          </Alert>
        )}
        <div className="context-row">
          <div>
            <span className="context-dot" />
            <strong>{customer.name}</strong>
            <span>{customer.sector}</span>
            <Status value={customer.scenario} />
          </div>
          <span>
            {fmtDate(range.from)} — {fmtDate(range.to)} ·{' '}
            {differenceInCalendarDays(parseISO(range.to), parseISO(range.from)) + 1}{' '}
            {range.from === range.to ? 'day' : 'days'}
          </span>
        </div>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          className="main-tabs"
          aria-label="Client engagement sections"
        >
          {tabs.map((name, i) => (
            <Tab key={name} label={name} id={`tab-${i}`} aria-controls={`panel-${i}`} />
          ))}
        </Tabs>
        {(live || autoRefresh || simulation.revision > 0) && (
          <section className="live-simulation-panel" aria-label="Live simulation status">
            <div>
              <strong>
                <span className={running ? 'live-dot running' : 'live-dot'} />
                {running
                  ? 'Live simulation running'
                  : live || autoRefresh
                    ? 'Simulation paused for review'
                    : 'Simulation paused'}
              </strong>
              <p>
                Fictional events only ·{' '}
                {live ? 'Demo day view' : 'Selected reporting period retained'} · {live ? '4' : '8'}
                -second updates when enabled · {updated} · Revision {simulation.revision}
              </p>
              <div className="simulation-actions">
                <Button size="small" onClick={exportSummary}>
                  Quick summary CSV
                </Button>
                {savedRange && (
                  <Button
                    size="small"
                    onClick={() => {
                      setLive(false);
                      setRange(savedRange);
                      setDraftFrom(parseISO(savedRange.from));
                      setDraftTo(parseISO(savedRange.to));
                      setPreset(null);
                      setSavedRange(null);
                    }}
                  >
                    Return to report period
                  </Button>
                )}
                <Button
                  size="small"
                  onClick={() => {
                    setLive(false);
                    setAutoRefresh(false);
                    setSavedRange(null);
                    setSimulation(initialSimulation());
                    changePreset(3);
                    setToast('Simulation reset to the original fictional records.');
                  }}
                >
                  Reset simulation
                </Button>
              </div>
            </div>
            <ol
              className="live-event-feed"
              aria-label="Recent simulated activity"
              aria-live="polite"
              aria-atomic="true"
            >
              {simulation.events
                .filter((event) => event.customerId === customerId)
                .slice(0, 3)
                .map((event) => (
                  <li key={event.id}>
                    <time>{event.time.slice(11, 16)} UTC</time>
                    <span>{event.text}</span>
                  </li>
                ))}
              {!simulation.events.some((event) => event.customerId === customerId) && (
                <li>Waiting for the next fictional event…</li>
              )}
            </ol>
          </section>
        )}
        <div
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className="tab-content"
        >
          {tab === 0 && (
            <>
              <div className="metrics overview-metrics">
                {layout.order
                  .filter((id) => !layout.hidden.includes(id))
                  .map((id) => (
                    <MetricCard key={id} metric={metrics[id]} />
                  ))}
              </div>
              {!layout.order.some((id) => !layout.hidden.includes(id)) && (
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography>All overview cards are hidden.</Typography>
                  <Button onClick={() => saveLayout({ order: defaultLayout, hidden: [] })}>
                    Restore default cards
                  </Button>
                </Paper>
              )}
              <div className="definition-banner">
                <Info text="Enabled accounts, recorded engagement and commercial active-user definitions are different measures. This prototype does not implement billing-grade utilisation." />
                <span>Commercial 365-day active-user definition to be validated separately.</span>
                <span className="mock-note">Illustrative records only</span>
              </div>
              <div className="two-equal growth-row">
                <Panel
                  title="Profiles created over time"
                  subtitle="New profiles by creation timestamp; separate from enabled accounts and engagement."
                  action={
                    <Button size="small" onClick={showGrowth}>
                      View profiles
                    </Button>
                  }
                >
                  <TimeLines points={points} created />
                </Panel>
                {allocationPanel}
              </div>
              <div className="two-columns engagement-row">
                <Panel
                  title="Recorded user engagement over time"
                  subtitle="Distinct users with recorded activity in each chart interval."
                  action={
                    <Info text="Each chart bucket counts distinct users with recorded activity in that interval: any web/mobile activity for Engaged users, iOS or Android for Mobile users, and web activity for Web users. Platform counts overlap; users may recur across intervals. Do not sum bucket counts to obtain period users." />
                  }
                >
                  <TimeLines points={points} />
                </Panel>
                <Panel
                  title="Platform engagement"
                  subtitle="Distinct period users, grouped by observed platform mix."
                  action={
                    <Info text="The donut groups users exclusively: Web only, iOS only, Android only or Multi-platform. Raw platform counts overlap and are available in Users." />
                  }
                >
                  <Donut
                    data={data.platformMix}
                    total={data.engaged.length}
                    label="engaged users"
                  />
                  <Typography variant="caption" color="text.secondary" className="panel-note">
                    Platform counts can overlap. Multi-platform users are counted once here.
                  </Typography>
                </Panel>
              </div>
              <div className="section-heading">
                <Typography variant="h2">Operational engagement</Typography>
                <span>Recorded evidence in the selected period</span>
              </div>
              <div className="metrics operational-metrics">
                {operations.map((metric) => (
                  <MetricCard key={metric.id} metric={metric} />
                ))}
              </div>
              <div className="footprint-row">
                <Suspense
                  fallback={
                    <Paper variant="outlined" sx={{ p: 3 }}>
                      Loading traveller footprint…
                    </Paper>
                  }
                >
                  <TravellerFootprint
                    key={prefix}
                    data={data}
                    range={range}
                    onTravel={() => setTab(2)}
                    onReceipts={(point, kind, scope) => {
                      if (kind === 'trips')
                        openRecords(
                          `Trips to ${point.location}`,
                          `${scope}. One mock itinerary per booking reference, counted by start date. Itinerary segments are not counted separately.`,
                          point.trips,
                          tripColumns,
                          'map-travel',
                        );
                      else if (kind === 'checkins')
                        openRecords(
                          `Check-ins in ${point.location}`,
                          `${scope}. Fictional check-in requests at this approximate city location. Each request is one record.`,
                          point.checkins,
                          checkColumns,
                          'map-check-ins',
                        );
                      else
                        openRecords(
                          `SOS records in ${point.location}`,
                          `${scope}. Fictional assistance records at this approximate city location. No emergency service is contacted.`,
                          point.sos,
                          sosColumns,
                          'map-sos',
                        );
                    }}
                  />
                </Suspense>
              </div>
              <div className="insight-strip">
                <span className="insight-icon">
                  <BusinessOutlinedIcon />
                </span>
                <div>
                  <strong>Suggested account review topic</strong>
                  <Typography variant="body2" color="text.secondary">
                    {accountFocus}
                  </Typography>
                </div>
              </div>
              <div className="recent-grid">
                <Records
                  title="Recent user activity"
                  subtitle="Latest recorded evidence in this period"
                  rows={recent}
                  columns={recentColumns}
                  filename={file('recent-users')}
                  compact
                  onRow={(row) =>
                    showUsers(
                      data.users.filter((u) => u.id === row.id),
                      String(row.name),
                    )
                  }
                />
                <Records
                  title="Recent SOS activity"
                  subtitle="Fictional requests and acknowledgement"
                  rows={[...data.sos].sort((a, b) => b.time.localeCompare(a.time))}
                  columns={[sosColumns[1], sosColumns[0], sosColumns[2], sosColumns[3]]}
                  filename={file('recent-sos')}
                  compact
                />
                <Panel
                  title="Client integrations"
                  subtitle="Mock configuration overview"
                  action={
                    <Button size="small" onClick={() => setTab(4)}>
                      View all
                    </Button>
                  }
                >
                  <div className="mini-integrations">
                    {customer.integrations.slice(0, 4).map((i) => (
                      <button key={i.id} onClick={() => setTab(4)}>
                        <span>
                          <strong>{i.provider}</strong>
                          <small>{i.type}</small>
                        </span>
                        <Status value={i.status} />
                      </button>
                    ))}
                  </div>
                </Panel>
              </div>
            </>
          )}
          {tab === 1 && (
            <>
              <div className="tab-intro">
                <div>
                  <Typography variant="h2">User engagement</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Explore recorded activity and the evidence behind it.
                  </Typography>
                </div>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadOutlinedIcon />}
                  onClick={() =>
                    downloadSnapshotCsv(
                      file('user-engagement'),
                      csvRows(data.users, userColumns),
                      userColumns.map((c) => c.headerName!),
                    )
                  }
                >
                  Export user engagement
                </Button>
              </div>
              <div className="metrics four-metrics">
                <MetricCard metric={metrics.created} />
                <MetricCard metric={metrics.enabled} />
                <MetricCard
                  metric={{
                    ...metrics.engaged,
                    id: 'engaged30',
                    label: 'Engaged in last 30 days',
                    value: user30.length,
                    previous: undefined,
                    note: 'Rolling window ending at To date',
                    definition:
                      'Distinct users with recorded engagement in the rolling 30 days ending at To date, independent of the selected From date.',
                    onClick: () =>
                      showUsers(
                        user30,
                        `${n(user30.length)} users engaged in last 30 days`,
                        `Distinct fictional users with engagement in the rolling 30 days ending ${fmtDate(range.to)}. This window is independent of the dashboard From date.`,
                      ),
                  }}
                />
                <MetricCard
                  metric={{
                    ...metrics.engaged,
                    id: 'engaged90',
                    label: 'Engaged in last 90 days',
                    value: user90.length,
                    previous: undefined,
                    note: 'Rolling window ending at To date',
                    definition:
                      'Distinct users with recorded engagement in the rolling 90 days ending at To date, independent of the selected From date.',
                    onClick: () =>
                      showUsers(
                        user90,
                        `${n(user90.length)} users engaged in last 90 days`,
                        `Distinct fictional users with engagement in the rolling 90 days ending ${fmtDate(range.to)}. This window is independent of the dashboard From date.`,
                      ),
                  }}
                />
                <MetricCard
                  metric={{
                    ...metrics.mobile,
                    id: 'registered',
                    label: 'Registered mobile users',
                    value: data.registered.length,
                    previous: undefined,
                    note: 'Registration evidence at period end',
                    definition:
                      'Users with a fictional mobile registration record. Registration is not proof of current installation, usage or uninstall.',
                    onClick: () =>
                      showUsers(
                        data.registered,
                        `${n(data.registered.length)} registered mobile users`,
                        'Fictional mobile registration evidence as of To date. This does not prove recent engagement or current app installation.',
                      ),
                  }}
                />
              </div>
              {allocationPanel}
              <Records
                key={`${customer.id}-created`}
                title="Profiles created in selected period"
                subtitle="Creation does not establish engagement or commercial billing."
                rows={data.created}
                columns={profileColumns}
                filename={file('profiles-created')}
                filterField="creationSource"
                choices={['HR import', 'Portal', 'SSO provisioning', 'Travel import']}
              />
              <div className="two-equal">
                <Panel
                  title="Platform engagement"
                  subtitle="Recorded platform counts can overlap; multi-platform is a subset."
                >
                  <HorizontalBars
                    data={data.platforms}
                    onSelect={(label) =>
                      showUsers(
                        data.engaged.filter((u) =>
                          label === 'Multi-platform'
                            ? u.platforms.length > 1
                            : u.platforms.includes(label as 'Web' | 'iOS' | 'Android'),
                        ),
                        `Recorded ${label} engagement`,
                      )
                    }
                  />
                </Panel>
                <Panel
                  title="Observed engagement age"
                  subtitle="As of To date; not a commercial inactivity classification."
                  action={
                    <Info text="Age bands use the latest recorded activity, with 30-day, 90-day, 300-day and 365-day interval boundaries. No recorded evidence means no activity evidence in the preceding 365 days as of To date; it does not establish inactivity." />
                  }
                >
                  <HorizontalBars
                    data={data.ages}
                    onSelect={(label) =>
                      showUsers(
                        data.users.filter((u) => u.age === label),
                        label,
                        'Observed age of latest activity evidence in the preceding 365 days as of To date. No recorded evidence does not establish commercial inactivity.',
                      )
                    }
                  />
                </Panel>
              </div>
              <Records
                key={`${customer.id}-users`}
                title="User engagement records"
                subtitle="All fictional accounts; activity columns describe recorded evidence as of To date. Use column menus to sort or filter."
                rows={data.users}
                columns={userColumns}
                filename={file('users')}
                filterField="age"
                choices={[...AGE_BANDS]}
                onRow={(row) =>
                  showUsers(
                    data.users.filter((u) => u.id === row.id),
                    String(row.name),
                  )
                }
              />
              <UsageConcepts
                key={`${customerId}-user-concepts`}
                customer={customer}
                range={range}
                asOf={simulation.now}
                mode="users"
              />
            </>
          )}
          {tab === 2 && (
            <>
              <div className="tab-intro">
                <div>
                  <Typography variant="h2">Travel & traveller footprint</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Journey volumes, destinations and illustrative exposure.
                  </Typography>
                </div>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadOutlinedIcon />}
                  onClick={() =>
                    downloadSnapshotCsv(
                      file('travel'),
                      csvRows(data.trips, tripColumns),
                      tripColumns.map((c) => c.headerName!),
                    )
                  }
                >
                  Export travel list
                </Button>
              </div>
              <div className="metrics four-metrics">
                <MetricCard metric={{ ...metrics.trips, label: 'Traveller trips' }} />
                <MetricCard
                  metric={{
                    ...metrics.engaged,
                    id: 'travellers',
                    label: 'Distinct travellers',
                    value: data.travellers,
                    previous: previous.travellers,
                    current: data.travellers,
                    note: 'Unique users with a trip',
                    definition:
                      'Distinct fictional user IDs on itineraries starting in the selected period.',
                    onClick: () =>
                      showUsers(
                        data.users.filter((u) => data.trips.some((t) => t.userId === u.id)),
                        'Distinct travellers',
                        'Distinct fictional user IDs on itineraries starting in the selected period. Travel evidence is separate from web or mobile engagement.',
                      ),
                  }}
                />
                <MetricCard
                  metric={{
                    ...metrics.trips,
                    id: 'countries',
                    label: 'Countries visited',
                    value: data.countries,
                    previous: undefined,
                    note: 'Distinct itinerary destinations',
                    definition:
                      'Distinct countries on mock itineraries starting in the period. This is planned travel evidence, not verified physical presence.',
                    onClick: () =>
                      openRecords(
                        'Destination countries',
                        'Distinct countries represented by selected mock trips.',
                        groupCounts(data.trips, (t) => t.country),
                        [
                          { field: 'label', headerName: 'Country', flex: 1 },
                          { field: 'value', headerName: 'Trips', width: 150 },
                        ],
                        'countries',
                      ),
                  }}
                />
                <MetricCard
                  metric={{
                    ...metrics.trips,
                    id: 'risk',
                    label: 'Higher-risk trips',
                    value: data.highRisk.length,
                    previous: previous.highRisk.length,
                    current: data.highRisk.length,
                    note: 'High + Severe mock risk',
                    alert: true,
                    definition:
                      'Trips to destinations assigned High or Severe in this fictional dataset. No current risk assessment is implied.',
                    onClick: () => showTrips(data.highRisk, 'Higher-risk trips'),
                  }}
                />
              </div>
              <div className="two-columns">
                <Panel title="Trips over time" subtitle="Each itinerary counted once by start date">
                  <TimeLines points={points} travel />
                </Panel>
                <Panel title="Top destinations" subtitle="Select a destination to see the journeys">
                  <HorizontalBars data={data.destinations} onSelect={destinationClick} />
                </Panel>
              </div>
              <div className="two-equal">
                <Panel title="Travel by region" subtitle="Trips grouped by destination region">
                  <Columns data={data.regions} />
                </Panel>
                <Panel
                  title="Travel by destination risk"
                  subtitle="Illustrative classifications for this demonstration"
                >
                  <Donut data={data.risks} total={data.trips.length} label="trips" risk />
                </Panel>
              </div>
              <div className="definition-banner">
                <Info text="Counted by itinerary start date, not segment count, feed message count or actual presence." />
                <span>
                  One mock booking reference = one itinerary. Travellers are deduplicated by user
                  ID.
                </span>
              </div>
              <Records
                key={`${customer.id}-travel`}
                title="Traveller journeys"
                subtitle="Mock provider and booking evidence"
                rows={data.trips}
                columns={tripColumns}
                filename={file('travel')}
                choices={['Low', 'Moderate', 'High', 'Severe']}
                filterField="risk"
              />
              <Records
                key={`${customer.id}-ingestions`}
                title="Accepted PNR ingestions"
                subtitle="Accepted feed records by receipt date. Updates can refer to an existing booking; this is separate from trip counts by travel start date."
                rows={data.ingestions}
                columns={ingestionColumns}
                filename={file('pnr-ingestions')}
                filterField="provider"
                choices={[...new Set(data.ingestions.map((i) => i.provider))]}
              />
            </>
          )}
          {tab === 3 && (
            <>
              <div className="tab-intro">
                <div>
                  <Typography variant="h2">Safety & recorded alerts</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Operational records, response evidence and recipient sends.
                  </Typography>
                </div>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadOutlinedIcon />}
                  onClick={() => {
                    downloadSnapshotCsv(
                      file('safety'),
                      [
                        ...csvRows(data.checkins, checkColumns).map((r) => ({
                          Record: 'Check-in',
                          ...r,
                        })),
                        ...csvRows(data.sos, sosColumns).map((r) => ({ Record: 'SOS', ...r })),
                        ...csvRows(data.receivedCheckins, receivedColumns).map((r) => ({
                          Record: 'Received check-in',
                          ...r,
                        })),
                        ...csvRows(alertRows(data), alertColumns).map((r) => ({
                          Record: 'Alert',
                          ...r,
                        })),
                      ],
                      [
                        'Record',
                        'Traveller',
                        'Requested',
                        'Completed',
                        'Status',
                        'Location',
                        'Time',
                        'Acknowledgement',
                        'Alert',
                        'Risk',
                        'Type',
                        'Recipients / sends',
                        'Date/time',
                      ],
                    );
                    setToast('Combined mock safety and alert records exported.');
                  }}
                >
                  Export safety records
                </Button>
              </div>
              <div className="metrics five-metrics">
                {[
                  { ...operations[0], label: 'Check-in requests sent' },
                  {
                    id: 'received',
                    label: 'Check-ins received',
                    value: data.receivedCheckins.length,
                    icon: <CheckCircleOutlineIcon />,
                    note: 'Counted by receipt time',
                    definition:
                      'Received check-in events in the period, including scheduled responses and traveller-initiated check-ins. Separate from request-cohort response rate.',
                    onClick: () =>
                      openRecords(
                        'Received check-ins',
                        'Counted by receipt time. A received check-in can be unscheduled; request-cohort completions are counted separately.',
                        data.receivedCheckins,
                        receivedColumns,
                        'received-checkins',
                      ),
                  },
                  operations[3],
                  operations[1],
                  operations[2],
                  {
                    ...operations[2],
                    id: 'unique',
                    label: 'Unique alert recipients',
                    value: data.recipients,
                    note: 'Deduplicated within period',
                    definition:
                      'Distinct fictional recipient user IDs across selected alert records.',
                    onClick: () =>
                      showUsers(
                        data.users.filter((u) =>
                          data.alerts.some((a) => a.recipients.includes(u.id)),
                        ),
                        'Unique alert recipients',
                        'Distinct fictional recipients of recorded alert sends in the selected period. Being a recipient is not proof of engagement, delivery or reading.',
                      ),
                  },
                ].map((m) => (
                  <MetricCard key={m.id} metric={m} />
                ))}
              </div>
              <div className="two-columns">
                <Panel
                  title="Recorded alert sends over time"
                  subtitle="Recipient send records, without delivery or read claims"
                >
                  <TimeLines points={points} alerts />
                </Panel>
                <Panel title="Check-in outcomes" subtitle="All requests in the selected period">
                  <Donut
                    data={groupCounts(data.checkins, (c) => c.status)}
                    total={data.checkins.length}
                    label="requests"
                  />
                </Panel>
              </div>
              <div className="two-equal">
                <Panel
                  title="Alerts by risk"
                  subtitle="Number of alert records, not recipient sends"
                >
                  <Columns data={groupCounts(data.alerts, (a) => a.risk)} risk />
                </Panel>
                <Panel title="Alerts by type" subtitle="Fictional operational categories">
                  <HorizontalBars
                    data={groupCounts(data.alerts, (a) => a.type)}
                    onSelect={(label) =>
                      openRecords(
                        `${label} alerts`,
                        'Fictional alert records in the selected period. Select an alert to see recipient receipts.',
                        alertRows(data).filter((a) => a.type === label),
                        alertColumns,
                        'alerts-by-type',
                        showRecipients,
                      )
                    }
                  />
                </Panel>
              </div>
              <Alert severity="info" className="safety-note">
                Recorded alert sends do not establish universal delivery or read rates. All safety
                records are fictional.
              </Alert>
              <Tabs
                value={safetyTab}
                onChange={(_, i) => setSafetyTab(i)}
                aria-label="Safety record categories"
                sx={{ mb: 2 }}
              >
                <Tab label={`Check-ins (${n(data.checkins.length)})`} />
                <Tab label={`SOS (${n(data.sos.length)})`} />
                <Tab label={`Alerts (${n(data.alerts.length)})`} />
              </Tabs>
              {safetyTab === 0 && (
                <Records
                  key={`${customer.id}-checks`}
                  title="Check-in records"
                  rows={data.checkins}
                  columns={checkColumns}
                  filename={file('check-ins')}
                  filterField="status"
                  choices={['Completed', 'Missed', 'Pending']}
                />
              )}
              {safetyTab === 0 && (
                <Records
                  title="Received check-ins"
                  subtitle="Receipt-time cohort, including traveller-initiated check-ins without a request. This count need not equal completed requests in the request-date cohort."
                  rows={data.receivedCheckins}
                  columns={receivedColumns}
                  filename={file('received-checkins')}
                  filterField="source"
                  choices={['Scheduled response', 'Traveller-initiated']}
                />
              )}
              {safetyTab === 1 && (
                <Records
                  key={`${customer.id}-sos`}
                  title="SOS records"
                  rows={data.sos}
                  columns={sosColumns}
                  filename={file('sos')}
                />
              )}
              {safetyTab === 2 && (
                <Records
                  key={`${customer.id}-alerts`}
                  title="Alert records"
                  subtitle="Search risk, channel, targeting context or recipient email. Select an alert to inspect recipient receipts."
                  rows={alertRows(data)}
                  columns={alertColumns}
                  filename={file('alerts')}
                  filterField="risk"
                  choices={['Low', 'Moderate', 'High', 'Severe']}
                  onRow={showRecipients}
                />
              )}
              <UsageConcepts
                key={`${customerId}-safety-concepts`}
                customer={customer}
                range={range}
                asOf={simulation.now}
                mode="safety"
              />
            </>
          )}
          {tab === 4 && (
            <>
              <div className="tab-intro">
                <div>
                  <Typography variant="h2">Client integrations</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Configuration and observed feed evidence for {customer.name}.
                  </Typography>
                </div>
                <span className="mock-pill">Fictional integration states</span>
              </div>
              <div className="integration-summary">
                <LinkIcon />
                <div>
                  <strong>
                    {activeIntegrations.length} active mock{' '}
                    {activeIntegrations.length === 1 ? 'integration' : 'integrations'}
                  </strong>
                  <Typography variant="body2" color="text.secondary">
                    {integrationsNeedingAttention}{' '}
                    {integrationsNeedingAttention === 1 ? 'needs' : 'need'} attention · No provider
                    connections are made
                  </Typography>
                </div>
                <Button
                  variant="outlined"
                  onClick={() =>
                    downloadSnapshotCsv(
                      file('integrations'),
                      customer.integrations.map((i) => ({
                        Provider: i.provider,
                        Type: i.type,
                        Status: i.status,
                        'Last observed': i.lastUsed,
                        Detail: i.detail,
                      })),
                    )
                  }
                  startIcon={<FileDownloadOutlinedIcon />}
                >
                  Export overview
                </Button>
              </div>
              <div className="integrations-grid">
                {customer.integrations.map((i) => (
                  <Paper key={i.id} variant="outlined" className="integration-card">
                    <div className="integration-card-top">
                      <div className={`provider-monogram provider-${i.id}`}>
                        {i.provider === 'SAP SuccessFactors' ? 'SAP' : i.provider.slice(0, 2)}
                      </div>
                      <Status value={i.status} />
                    </div>
                    <Typography variant="h3">{i.provider}</Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ mt: 0.7 }}>
                      {i.type}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="caption" color="text.secondary">
                      {i.type === 'TMC'
                        ? 'Last observed travel feed'
                        : i.type === 'SSO'
                          ? 'Last mock SSO sign-in'
                          : 'HR credential last used (mock)'}
                    </Typography>
                    <Typography fontWeight={500} sx={{ mt: 0.5 }}>
                      {i.lastUsed ? fmtDate(i.lastUsed) : 'No recorded evidence'}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1.5, minHeight: 55 }}
                    >
                      {i.detail}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() =>
                        setDetail({
                          title: `${i.provider} · ${i.type}`,
                          description: `${customer.name} · fictional integration evidence`,
                          content: (
                            <>
                              <Status value={i.status} />
                              <Typography sx={{ mt: 2 }}>{i.detail}</Typography>
                              <Typography sx={{ mt: 2 }}>
                                Last observed: {fmtDate(i.lastUsed)}
                              </Typography>
                              <Typography color="text.secondary" sx={{ mt: 2 }}>
                                Integration state is a snapshot as of 07 Oct 2026 and does not
                                change with the reporting window.
                              </Typography>
                              {i.type === 'TMC' && (
                                <Button
                                  sx={{ mt: 2 }}
                                  variant="outlined"
                                  onClick={() =>
                                    showTrips(
                                      data.trips.filter((t) => t.provider === i.provider),
                                      `${i.provider} journeys`,
                                    )
                                  }
                                >
                                  View mock journeys in selected period
                                </Button>
                              )}
                            </>
                          ),
                        })
                      }
                      endIcon={<ArrowForwardIcon />}
                      sx={{ mt: 1 }}
                    >
                      View details
                    </Button>
                  </Paper>
                ))}
              </div>
              <IntegrationRegister
                customers={simulation.customers}
                customerId={customerId}
                onEditing={setEditingContact}
              />
              <div className="definition-banner">
                <Info text="Configuration records do not prove a live connection or feed health. This is a fabricated snapshot at 07 Oct 2026, independent of selected dates." />
                <span>
                  All provider names are illustrative. Integration state is a mock snapshot as of 07
                  Oct 2026.
                </span>
              </div>
            </>
          )}
        </div>
        <footer>
          <span>Serenity Local / HULA · Client Engagement</span>
          <span>Event POC · All data fictional · Baseline 07 Oct 2026</span>
        </footer>
      </main>
      <Drawer
        anchor="right"
        open={!!detail}
        onClose={() => setDetail(null)}
        slotProps={{
          paper: {
            className: 'detail-drawer',
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': 'detail-title',
          },
        }}
      >
        <div className="drawer-heading">
          <span className="eyebrow">RECORDED EVIDENCE · MOCK DATA</span>
          <IconButton aria-label="Close details" onClick={() => setDetail(null)}>
            <CloseIcon />
          </IconButton>
        </div>
        {detail && (
          <>
            <Typography id="detail-title" variant="h2" sx={{ px: 3 }}>
              {detail.title}
            </Typography>
            <Typography color="text.secondary" sx={{ px: 3, mt: 1.5 }}>
              {detail.description}
            </Typography>
            <div className="drawer-context">
              {customer.name} · {fmtDate(range.from)} — {fmtDate(range.to)}
            </div>
            <div className="drawer-content">
              {detail.rows && detail.columns ? (
                <ExportContext.Provider value={detail.scope || exportScope}>
                  <Records
                    key={detail.title}
                    title="Supporting records"
                    subtitle="Search, sort, filter and export the mock receipts."
                    rows={detail.rows}
                    columns={detail.columns}
                    filename={detail.filename || file('records')}
                    onRow={detail.onRow}
                  />
                </ExportContext.Provider>
              ) : (
                detail.content
              )}
            </div>
          </>
        )}
      </Drawer>
      <Drawer
        anchor="right"
        open={customise}
        onClose={() => setCustomise(false)}
        slotProps={{
          paper: {
            className: 'customise-drawer',
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': 'customise-title',
          },
        }}
      >
        <div className="drawer-heading">
          <Typography variant="h2" id="customise-title">
            Customise dashboard
          </Typography>
          <IconButton aria-label="Close customisation" onClick={() => setCustomise(false)}>
            <CloseIcon />
          </IconButton>
        </div>
        <Typography variant="body2" color="text.secondary" sx={{ px: 3, mb: 3 }}>
          Show, hide or reorder overview cards. Preferences are saved in this browser.
        </Typography>
        {layout.order.map((id, i) => (
          <div className="layout-row" key={id}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!layout.hidden.includes(id)}
                  onChange={(_, checked) =>
                    saveLayout({
                      ...layout,
                      hidden: checked
                        ? layout.hidden.filter((x) => x !== id)
                        : [...layout.hidden, id],
                    })
                  }
                />
              }
              label={metrics[id].label}
            />
            <div>
              <IconButton
                aria-label={`Move ${metrics[id].label} up`}
                disabled={i === 0}
                onClick={() => moveCard(i, -1)}
              >
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label={`Move ${metrics[id].label} down`}
                disabled={i === layout.order.length - 1}
                onClick={() => moveCard(i, 1)}
              >
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
        ))}
        <div className="customise-actions">
          <Button
            variant="outlined"
            onClick={() => saveLayout({ order: defaultLayout, hidden: [] })}
          >
            Restore defaults
          </Button>
          <Button variant="contained" onClick={() => setCustomise(false)}>
            Done
          </Button>
        </div>
      </Drawer>
      {reportSnapshot && (
        <ReportCenter
          snapshot={reportSnapshot}
          onClose={() => setReportSnapshot(null)}
          onPreview={(schedule) => {
            const target = simulation.customers.find((c) => c.id === schedule.customerId);
            if (target) {
              const stored = allocations[target.id];
              setReportSnapshot(
                captureReport(
                  target,
                  { from: schedule.from, to: schedule.to },
                  simulation.now,
                  simulation.revision,
                  stored ? stored.limit : target.limit,
                ),
              );
            }
          }}
        />
      )}
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        message={toast}
        onClose={() => setToast('')}
        action={
          <IconButton
            size="small"
            aria-label="Dismiss notification"
            color="inherit"
            onClick={() => setToast('')}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </ExportContext.Provider>
  );
}
function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
