import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';
import { format, isValid, parseISO, subDays } from 'date-fns';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fmtDate, groupCounts, n, presetRange, selectData, SNAPSHOT, type Range } from './data';
import { alertColumns, alertRows, checkColumns, dateColumn } from './components';
import {
  bookingCreations,
  dailyActivity,
  dashboardTabs,
  dashboardWidgets,
  defaultWidgets,
  validReportRange,
  type Widget,
} from './dashboardModel';
import CustomerHealth, { HealthControl } from './CustomerHealth';
import { CustomerReview } from './CustomerReviews';
import { normaliseReview, readReviews, reviewStorageKey, utcToday } from './reviews';
import DashboardRecords from './DashboardRecords';
import { ExportContext } from './reporting';
import useConfetti from './useConfetti';
import { initialRefreshSnapshot, refreshSnapshot } from './refresh';
import { demoClock } from './simulation';
import {
  profileColumns,
  userColumns,
  tripColumns,
  sosColumns,
  receivedColumns,
  nearbyAlertColumns,
} from './dashboardColumns';
import { evidenceRecords, ReadOnlyRecords } from './EvidenceRecords';
import { places, buildFootprint } from './footprint';
import AudienceFilters from './AudienceFilters';
import FeedEvidence, { feedColumns } from './FeedEvidence';
import EvidenceMap, { type MapItem } from './EvidenceMap';
import OverviewReport, { type OverviewCapture } from './OverviewReport';
import {
  audienceLabel,
  emptyAudience,
  filterCustomer,
  profilesFor,
  selectBriefings,
  facilitiesFor,
  geofencesFor,
  rulesFor,
  feedReceiptsFor,
  feedSummary,
  nearbyAlertEvidence,
  integrationEvidenceFor,
  type Audience,
} from './evidenceModel';
import {
  defaultPolicy,
  readPolicies,
  readCadences,
  readCustomerLayout,
  layoutKey,
} from './preferences';
const TravellerFootprint = lazy(() => import('./TravellerFootprint'));
const AlertMap = lazy(() => import('./AlertMap'));
const palette = ['#007dbb', '#1b8a5a', '#c77700', '#cc3d3d', '#1677b8', '#5b6476'];
type Receipt = {
  title: string;
  definition: string;
  rows?: GridValidRowModel[];
  columns?: GridColDef[];
  content?: ReactNode;
  accountWide?: boolean;
};

function WidgetFrame({
  widget,
  overview,
  children,
  onRemove,
  onInfo,
  dragSize,
  accountWide = false,
}: {
  widget: Widget;
  overview: boolean;
  children: ReactNode;
  onRemove: () => void;
  onInfo: () => void;
  dragSize?: { width: number; height: number };
  accountWide?: boolean;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    attributes,
    listeners,
  } = useSortable({ id: widget.id, disabled: !overview });
  return (
    <Paper
      ref={setNodeRef}
      component="section"
      onClick={(event) => {
        if (widget.kind === 'metric' && !(event.target as HTMLElement).closest('button'))
          event.currentTarget.querySelector<HTMLButtonElement>('.widget-metric')?.click();
      }}
      aria-label={widget.title}
      className={`dashboard-widget widget-${widget.width}`}
      data-widget-id={widget.id}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: transition,
        ...(isDragging && dragSize ? dragSize : {}),
        zIndex: isDragging ? 3 : undefined,
        opacity: isDragging ? 0.7 : 1,
      }}
    >
      <div className="widget-heading">
        {overview && (
          <IconButton
            size="small"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Move ${widget.title}`}
            sx={{ touchAction: 'none' }}
          >
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
        )}
        <Typography component="h2" className="widget-title">
          {widget.title}
        </Typography>
        <Tooltip title={widget.definition}>
          <IconButton size="small" aria-label={`About ${widget.title}`} onClick={onInfo}>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {overview && (
          <IconButton size="small" aria-label={`Remove ${widget.title}`} onClick={onRemove}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </div>
      {(widget.current || widget.kind === 'allocation' || accountWide) && (
        <Chip
          className="scope-badge"
          size="small"
          variant="outlined"
          label={
            widget.current || widget.kind === 'allocation'
              ? 'Current · Account-wide'
              : 'Account-wide'
          }
        />
      )}
      <div className="widget-body">{children}</div>
    </Paper>
  );
}

export default function App() {
  const chromeRef = useRef<HTMLDivElement>(null);
  const [chromeHeight, setChromeHeight] = useState(60);
  useLayoutEffect(() => {
    const chrome = chromeRef.current;
    if (!chrome) return;
    const measure = () => setChromeHeight(Math.ceil(chrome.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(chrome);
    return () => observer.disconnect();
  }, []);
  const [simulation, setSimulation] = useState(initialRefreshSnapshot);
  const customers = simulation.customers;
  const refreshTimer = useRef<number | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const celebrate = useConfetti();
  useEffect(() => {
    if (refreshVersion > 0) celebrate();
  }, [refreshVersion, celebrate]);
  useEffect(
    () => () => {
      if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
    },
    [],
  );
  const [customerId, setCustomerId] = useState('');
  const [tab, setTab] = useState(0);
  const [range, setRange] = useState<Range>(presetRange(3));
  const [from, setFrom] = useState<Date | null>(parseISO(range.from));
  const [to, setTo] = useState<Date | null>(parseISO(range.to));
  const [preset, setPreset] = useState<number | null>(3);
  const [policies, setPolicies] = useState(readPolicies);
  const [reviews, setReviews] = useState(readReviews);
  const [reviewToday, setReviewToday] = useState(utcToday);
  useEffect(() => {
    const update = () => setReviewToday(utcToday());
    const timer = window.setInterval(update, 60000);
    window.addEventListener('focus', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, []);
  const [cadences, setCadences] = useState(readCadences);
  const [audience, setAudience] = useState<Audience>(emptyAudience);
  const [layout, setLayout] = useState(() => readCustomerLayout('acme'));
  const [mapView, setMapView] = useState<{
    title: string;
    description: string;
    items: MapItem[];
  } | null>(null);
  const [report, setReport] = useState<OverviewCapture | null>(null);
  const [catalogue, setCatalogue] = useState(false);
  const [detail, setDetail] = useState<Receipt | null>(null);
  const [toast, setToast] = useState('');
  useEffect(() => {
    try {
      localStorage.setItem(reviewStorageKey, JSON.stringify(reviews));
    } catch {
      // Explicit edits report storage failures through saveLocal; initial examples stay session-local.
    }
  }, [reviews]);
  const [refreshing, setRefreshing] = useState(false);

  const [dragSize, setDragSize] = useState<{ width: number; height: number } | undefined>();
  const grid = useRef<HTMLDivElement>(null);
  const customer = customers.find((c) => c.id === customerId) || customers[0];
  const asOf = simulation.refreshedAt[customerId] || simulation.now;
  const calculated = demoClock(asOf);
  const scopedCustomer = useMemo(() => filterCustomer(customer, audience), [customer, audience]);
  const accountData = useMemo(() => selectData(customer, range), [customer, range]);
  const data = useMemo(() => selectData(scopedCustomer, range), [scopedCustomer, range]);
  const days = useMemo(() => dailyActivity(scopedCustomer, range), [scopedCustomer, range]);
  const profiles = useMemo(() => profilesFor(customer), [customer]);
  const briefings = useMemo(
    () => selectBriefings(customer, range, audience, asOf),
    [customer, range, audience, asOf],
  );
  const integrations = useMemo(() => integrationEvidenceFor(customer, asOf), [customer, asOf]);
  const nearAlerts = useMemo(
    () => nearbyAlertEvidence(customer, range, audience),
    [customer, range, audience],
  );
  const facilities = useMemo(() => facilitiesFor(customer).filter((f) => !f.deleted), [customer]);
  const geofences = useMemo(() => geofencesFor(customer), [customer]);
  const rules = useMemo(() => rulesFor(customer), [customer]);
  const scopeKey = `${customerId}-${range.from}-${range.to}-${JSON.stringify(audience)}`;
  const accountWide = (w: Widget) =>
    Boolean(w.current) ||
    [
      'allocation',
      'integrations',
      'facilities',
      'geofences',
      'notification-rules',
      'push-audits',
      'push-audits-count',
      'feed-evidence',
      'notes',
    ].includes(w.id) ||
    w.kind === 'integration';
  const thirty = useMemo(
    () =>
      selectData(scopedCustomer, {
        from: format(subDays(parseISO(range.to), 29), 'yyyy-MM-dd'),
        to: range.to,
      }),
    [scopedCustomer, range.to],
  );
  const ninety = useMemo(
    () =>
      selectData(scopedCustomer, {
        from: format(subDays(parseISO(range.to), 89), 'yyyy-MM-dd'),
        to: range.to,
      }),
    [scopedCustomer, range.to],
  );
  const bookings = useMemo(() => bookingCreations(scopedCustomer, range), [scopedCustomer, range]);
  const requestedRange = {
    from: from && isValid(from) ? format(from, 'yyyy-MM-dd') : '',
    to: to && isValid(to) ? format(to, 'yyyy-MM-dd') : '',
  };
  const valid = validReportRange(requestedRange);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const source = ['', 'users', 'travel', 'safety', 'integrations'][tab];
  const visible =
    tab === 0
      ? layout.flatMap((id) => dashboardWidgets.find((w) => w.id === id) || [])
      : dashboardWidgets.filter((w) => w.tab === source);
  const persist = (next: string[]) => {
    setLayout(next);
    try {
      localStorage.setItem(layoutKey(customerId), JSON.stringify(next));
    } catch {
      setToast('Layout saved for this session. Browser storage is unavailable.');
    }
  };
  const choose = (id: string) => {
    if (refreshTimer.current !== null) {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    setRefreshing(false);
    setCustomerId(id);
    setTab(0);
    setDetail(null);
    setAudience(emptyAudience());
    setMapView(null);
    if (id) setLayout(readCustomerLayout(id));
  };
  const refresh = () => {
    if (refreshTimer.current !== null) return;
    const ids = customerId ? [customerId] : customers.map((c) => c.id);
    setRefreshing(true);
    refreshTimer.current = window.setTimeout(() => {
      refreshTimer.current = null;
      setSimulation((previous) => refreshSnapshot(previous, ids));
      setDetail(null);
      setMapView(null);
      setRefreshing(false);
      setRefreshVersion((version) => version + 1);
      setToast(customerId ? `Metrics updated for ${customer.name}.` : 'Customer metrics updated.');
    }, 450);
  };
  const setDates = (start: Date | null, end: Date | null) => {
    setFrom(start);
    setTo(end);
    setPreset(null);
    if (start && end && isValid(start) && isValid(end)) {
      const next = { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') };
      if (validReportRange(next)) {
        setRange(next);
        setDetail(null);
      }
    }
  };
  const prepareRows = (rows: GridValidRowModel[]) =>
    rows.map((row) => ({
      ...row,
      email: row.email || customer.users.find((user) => user.id === row.userId)?.email,
      country: row.country || places[String(row.location)]?.country,
      currentStatus:
        typeof row.enabled === 'boolean'
          ? row.enabled
            ? 'Enabled'
            : 'Disabled'
          : row.currentStatus,
      lastActivity: row.engaged === false ? null : row.lastActivity,
      groupMemberships: profiles.find((p) => p.userId === (row.userId || row.id))?.groups,
      role: profiles.find((p) => p.userId === (row.userId || row.id))?.role,
      travellerTag:
        profiles.find((p) => p.userId === (row.userId || row.id))?.travellerTag || 'Untagged',
    }));
  const receipt = (
    title: string,
    definition: string,
    rows: GridValidRowModel[],
    columns: GridColDef[],
    wholeAccount = false,
  ) =>
    setDetail({ title, definition, rows: prepareRows(rows), columns, accountWide: wholeAccount });
  const userReceipt = (
    title: string,
    rows = data.engaged,
    definition = 'Distinct users with recorded activity in the selected period.',
  ) => receipt(title, definition, rows, userColumns);
  const integrationColumns: GridColDef[] = [
    { field: 'provider', headerName: 'Provider' },
    { field: 'type', headerName: 'Type' },
    { field: 'status', headerName: 'Status' },
    dateColumn('lastUsed', 'Last observed'),
    { field: 'detail', headerName: 'Detail' },
  ];
  const openWidget = (w: Widget) => {
    const definition = w.definition;
    const evidence = evidenceRecords(customer, range, audience, w.id, asOf);
    if (evidence)
      return receipt(w.title, definition, evidence.rows, evidence.columns, accountWide(w));
    const users: Record<string, typeof data.users> = {
      enabled: accountData.enabled,
      disabled: accountData.disabled,
      used: accountData.enabled,
      engaged: data.engaged,
      mobile: data.mobile,
      registered: data.registered,
      engaged30: thirty.engaged,
      engaged90: ninety.engaged,
    };
    if (users[w.id])
      return receipt(
        w.title,
        definition,
        users[w.id],
        w.current ? profileColumns : userColumns,
        accountWide(w),
      );
    if (['limit', 'remaining', 'overage'].includes(w.id))
      return setDetail({
        title: w.title,
        definition,
        content: (
          <>
            <Typography variant="h5">
              {n(accountData.enabled.length)} enabled accounts / {n(customer.limit)} configured
              limit
            </Typography>
            <Button
              sx={{ mt: 2 }}
              onClick={() =>
                receipt(
                  'Enabled accounts',
                  'Current enabled-account snapshot. Account-wide.',
                  accountData.enabled,
                  profileColumns,
                  true,
                )
              }
            >
              View enabled accounts
            </Button>
          </>
        ),
      });
    if (w.id === 'created') return receipt(w.title, definition, data.created, profileColumns);
    if (w.id === 'travellers')
      return receipt(
        w.title,
        definition,
        data.users.filter((u) => data.trips.some((t) => t.userId === u.id)),
        profileColumns.slice(0, 3),
      );
    if (w.id === 'countries')
      return receipt(
        w.title,
        definition,
        groupCounts(data.trips, (t) => t.country).map((row) => ({
          ...row,
          country: row.label,
          trips: row.value,
        })),
        [
          { field: 'country', headerName: 'Country' },
          { field: 'trips', headerName: 'Traveller trips' },
        ],
      );
    if (['trips', 'higher-risk'].includes(w.id))
      return receipt(
        w.title,
        definition,
        w.id === 'higher-risk' ? data.highRisk : data.trips,
        tripColumns,
      );
    if (w.id === 'bookings')
      return receipt(w.title, definition, bookings, [
        { field: 'booking', headerName: 'Booking reference' },
        { field: 'provider', headerName: 'Provider' },
        dateColumn('time', 'First accepted (UTC)'),
      ]);
    if (w.id === 'sos') return receipt(w.title, definition, data.sos, sosColumns);
    if (w.id === 'received')
      return receipt(w.title, definition, data.receivedCheckins, receivedColumns);
    if (w.id === 'checks' || w.id === 'response')
      return receipt(w.title, definition, data.checkins, checkColumns);
    if (w.id === 'recipients')
      return userReceipt(
        w.title,
        data.users.filter((u) => data.alerts.some((a) => a.recipients.includes(u.id))),
        definition,
      );
    receipt(w.title, definition, alertRows(data), alertColumns);
  };
  const metricValue = (id: string): number | string =>
    ({
      enabled: accountData.enabled.length,
      disabled: accountData.disabled.length,
      limit: customer.limit,
      used: accountData.enabled.length,
      remaining: Math.max(0, customer.limit - accountData.enabled.length),
      overage: Math.max(0, accountData.enabled.length - customer.limit),
      created: data.created.length,
      engaged: data.engaged.length,
      mobile: data.mobile.length,
      engaged30: thirty.engaged.length,
      engaged90: ninety.engaged.length,
      registered: data.registered.length,
      bookings: bookings.length,
      trips: data.trips.length,
      travellers: data.travellers,
      countries: data.countries,
      'higher-risk': data.highRisk.length,
      received: data.receivedCheckins.length,
      sos: data.sos.length,
      checks: data.checkins.length,
      alerts: data.sends,
      response: data.responseRate === null ? '—' : `${data.responseRate.toFixed(1)}%`,
      recipients: data.recipients,
      briefings: briefings.filter((b) => b.kind === 'Briefing').length,
      'facilities-count': facilities.length,
      'geofences-count': geofences.length,
      'push-audits-count': evidenceRecords(customer, range, audience, 'push-audits', asOf)!.rows
        .length,
    })[id] ?? '—';
  const icon = (id: string) =>
    ['mobile', 'registered'].includes(id) ? (
      <SmartphoneIcon />
    ) : ['trips', 'bookings', 'travellers', 'countries', 'higher-risk'].includes(id) ? (
      <FlightTakeoffIcon />
    ) : id === 'sos' ? (
      <WarningAmberIcon />
    ) : ['checks', 'received'].includes(id) ? (
      <CheckCircleOutlineIcon />
    ) : ['alerts', 'recipients'].includes(id) ? (
      <NotificationsNoneIcon />
    ) : ['limit', 'remaining', 'overage', 'used', 'response'].includes(id) ? (
      <VerifiedUserOutlinedIcon />
    ) : (
      <PeopleOutlineIcon />
    );
  const recordsFor = (id: string): { rows: GridValidRowModel[]; columns: GridColDef[] } => {
    const evidence = evidenceRecords(customer, range, audience, id, asOf);
    if (evidence) return evidence;
    switch (id) {
      case 'profiles-records':
        return { rows: data.created, columns: profileColumns };
      case 'users-records':
        return { rows: data.users, columns: userColumns };
      case 'recent-users':
        return {
          rows: [...data.engaged]
            .sort((a, b) => (b.lastActivity || '').localeCompare(a.lastActivity || ''))
            .slice(0, 5),
          columns: userColumns,
        };
      case 'journeys':
        return { rows: data.trips, columns: tripColumns };
      case 'check-records':
        return { rows: data.checkins, columns: checkColumns };
      case 'received-records':
        return { rows: data.receivedCheckins, columns: receivedColumns };
      case 'sos-records':
        return { rows: data.sos, columns: sosColumns };
      case 'recent-sos':
        return {
          rows: [...data.sos].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5),
          columns: sosColumns.slice(0, 4),
        };
      case 'alert-records':
        return { rows: alertRows(data), columns: alertColumns };
      default:
        return { rows: integrations, columns: integrationColumns };
    }
  };
  const chart = (w: Widget, readOnly = false) => {
    const lineKeys: Record<
      string,
      Array<'created' | 'trips' | 'sends' | 'engaged' | 'mobile' | 'web'>
    > = {
      'profiles-trend': ['created'],
      'trips-trend': ['trips'],
      'alert-trend': ['sends'],
      'engagement-trend': ['engaged', 'mobile', 'web'],
    };
    const labels = {
      created: 'Profiles created',
      trips: 'Traveller trips',
      sends: 'Recorded alert sends',
      engaged: 'Recorded users',
      mobile: 'Mobile users',
      web: 'Web users',
    };
    const supporting = (index?: number) => {
      const day = index === undefined ? null : days[index].day;
      const selected = day ? selectData(scopedCustomer, { from: day, to: day }) : data;
      if (w.id === 'profiles-trend')
        receipt(
          w.title,
          `${w.definition}${day ? ` Selected UTC day: ${day}.` : ''}`,
          selected.created,
          profileColumns,
        );
      else if (w.id === 'trips-trend')
        receipt(
          w.title,
          `${w.definition}${day ? ` Selected UTC day: ${day}.` : ''}`,
          selected.trips,
          tripColumns,
        );
      else if (w.id === 'alert-trend')
        receipt(w.title, w.definition, alertRows(selected), alertColumns);
      else userReceipt(w.title, selected.engaged, w.definition);
    };
    if (lineKeys[w.id])
      return (
        <>
          <LineChart
            skipAnimation
            height={250}
            xAxis={[
              {
                scaleType: 'point',
                data: days.map((p) => p.day),
                tickLabelInterval: (_, i) =>
                  i % Math.max(1, Math.ceil(days.length / 6)) === 0 || i === days.length - 1,
                valueFormatter: (value) => String(value).slice(5),
              },
            ]}
            yAxis={[{ min: 0, tickMinStep: 1, width: 45 }]}
            series={lineKeys[w.id].map((key, i) => ({
              data: days.map((p) => p[key]),
              label: labels[key],
              showMark: days.length === 1,
              color: palette[i],
              valueFormatter: (value) =>
                `${value ?? 0} ${key === 'created' ? 'profiles created' : key === 'trips' ? 'trips' : key === 'sends' ? 'recorded sends' : 'users with recorded activity'} in UTC day`,
            }))}
            onAxisClick={
              readOnly
                ? undefined
                : (_, item) => {
                    if (item?.dataIndex !== undefined) supporting(item.dataIndex);
                  }
            }
          />
          <Typography variant="caption" color="text.secondary">
            {w.id === 'engagement-trend'
              ? 'Distinct users per UTC day; users can recur across days.'
              : 'Records by UTC date.'}
          </Typography>
          {!readOnly && (
            <IconButton
              size="small"
              aria-label={`View ${w.title} supporting records`}
              onClick={() => supporting()}
            >
              <ArrowForwardIcon fontSize="small" />
            </IconButton>
          )}
        </>
      );
    const distributions: Record<string, ReturnType<typeof groupCounts>> = {
      'platform-mix': data.platformMix,
      platforms: data.platforms,
      age: data.ages,
      destinations: data.destinations,
      regions: data.regions,
      'travel-risk': data.risks,
      'checkin-outcomes': groupCounts(data.checkins, (c) => c.status),
      'alert-risk': groupCounts(data.alerts, (a) => a.risk),
      'alert-type': groupCounts(data.alerts, (a) => a.type),
    };
    const points = distributions[w.id] || [];
    const choosePoint = (i: number) => {
      const label = points[i]?.label;
      if (!label) return;
      if (w.id === 'platforms' || w.id === 'platform-mix')
        userReceipt(
          w.title,
          data.engaged.filter((u) =>
            w.id === 'platform-mix'
              ? u.platform === label
              : label === 'Multi-platform'
                ? u.platforms.length > 1
                : u.platforms.some((p) => p === label),
          ),
          w.definition,
        );
      else if (w.id === 'age')
        userReceipt(
          w.title,
          data.users.filter((u) => u.age === label),
          w.definition,
        );
      else if (['destinations', 'regions', 'travel-risk'].includes(w.id))
        receipt(
          w.title,
          w.definition,
          data.trips.filter(
            (t) =>
              (w.id === 'destinations' ? t.destination : w.id === 'regions' ? t.region : t.risk) ===
              label,
          ),
          tripColumns,
        );
      else if (w.id === 'checkin-outcomes')
        receipt(
          w.title,
          w.definition,
          data.checkins.filter((c) => c.status === label),
          checkColumns,
        );
      else
        receipt(
          w.title,
          w.definition,
          alertRows(data).filter((a) => (w.id === 'alert-risk' ? a.risk : a.type) === label),
          alertColumns,
        );
    };
    if (!points.some((p) => p.value))
      return <Alert severity="info">No recorded data in this period.</Alert>;
    return (
      <>
        {['platform-mix', 'regions', 'travel-risk', 'checkin-outcomes', 'alert-type'].includes(
          w.id,
        ) ? (
          <PieChart
            skipAnimation
            height={250}
            colors={palette}
            series={[{ data: points, innerRadius: 45 }]}
            onItemClick={readOnly ? undefined : (_, item) => choosePoint(item.dataIndex)}
          />
        ) : (
          <BarChart
            skipAnimation
            height={250}
            layout="horizontal"
            yAxis={[{ scaleType: 'band', data: points.map((p) => p.label), width: 120 }]}
            xAxis={[{ tickMinStep: 1 }]}
            series={[{ data: points.map((p) => p.value), label: 'Records' }]}
            colors={palette}
            onItemClick={readOnly ? undefined : (_, item) => choosePoint(item.dataIndex)}
          />
        )}
        <Typography variant="caption" color="text.secondary">
          {w.id === 'platforms'
            ? 'Platform counts overlap; multi-platform is a subset.'
            : w.id === 'platform-mix'
              ? 'Exclusive categories, reconciled to recorded engagement.'
              : readOnly
                ? 'Recorded distribution.'
                : 'Recorded distribution. Select a chart item for supporting records.'}
        </Typography>
      </>
    );
  };
  const saveLocal = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      setToast('Saved for this session. Browser storage is unavailable.');
    }
  };
  const showMap = (
    title: string,
    items: MapItem[],
    description = 'Recorded positions illustrated at public city centres. These are not live user or asset locations.',
  ) => setMapView({ title, items, description });
  const inspectRow = (w: Widget, row: GridValidRowModel, columns: GridColDef[]) => {
    const facility = facilities.find((f) => f.id === row.id);
    const fence = geofences.find((f) => f.id === row.id);
    const rule = rules.find((r) => r.id === (row.ruleId || row.id));
    const point = places[String(row.location)];
    const sos =
      ['sos', 'sos-records', 'recent-sos'].includes(w.id) ||
      typeof row.acknowledgement === 'string';
    const traveller = row.travellerUserId
      ? customer.users.find((u) => u.id === row.travellerUserId)
      : null;
    const trip = row.tripId ? customer.trips.find((t) => t.id === row.tripId) : null;
    setDetail({
      title: w.title,
      definition: w.definition,
      rows: prepareRows([row]),
      columns,
      accountWide: accountWide(w),
      content: (
        <div className="receipt-actions">
          {sos && (
            <>
              <Typography>
                {row.acknowledgement || 'No acknowledgement evidence recorded.'}
              </Typography>
              <Button
                variant="outlined"
                disabled={!point}
                onClick={() =>
                  showMap('Recorded SOS location', [
                    {
                      id: String(row.id),
                      name: String(row.traveller),
                      lat: point.lat,
                      lng: point.lng,
                      detail: String(row.time),
                    },
                  ])
                }
              >
                {point ? 'Show recorded SOS location on map' : 'No usable recorded position'}
              </Button>
            </>
          )}
          {facility && (
            <>
              <Button
                variant="outlined"
                disabled={facility.lat === null || facility.lng === null}
                onClick={() => showMap(facility.name, [facility])}
              >
                {facility.lat === null ? 'No usable recorded position' : 'Show facility on map'}
              </Button>
              <Button
                onClick={() =>
                  receipt(
                    'Current based users',
                    'Users whose current primary based facility references this facility. Not occupancy, current presence or historical assignment.',
                    accountData.users.filter((u) =>
                      profiles.some((p) => p.userId === u.id && p.basedFacilityId === facility.id),
                    ),
                    profileColumns,
                    true,
                  )
                }
              >
                View current based users
              </Button>
            </>
          )}
          {fence && (
            <Button
              variant="outlined"
              onClick={() =>
                showMap(
                  fence.name,
                  [fence],
                  'Current geofence configuration, drawn around a public city centre. Geometry does not establish a transition or notification send.',
                )
              }
            >
              Show geofence boundary
            </Button>
          )}
          {rule && (
            <>
              <Typography variant="caption">
                Current rule configuration only. A rule-linked push audit does not identify a unique
                transition, historical geofence or recipient. A success flag is not delivery/read
                confirmation.
              </Typography>
              <Button
                variant="outlined"
                disabled={!rule.geofenceIds.length}
                onClick={() =>
                  showMap(
                    'Current rule coverage',
                    geofences.filter((f) => rule.geofenceIds.includes(f.id)),
                    'Current configured geofence coverage. This is not the location or geometry of a historical notification event.',
                  )
                }
              >
                Show current rule coverage
              </Button>
            </>
          )}
          {traveller && (
            <Button
              onClick={() =>
                receipt(
                  'Linked traveller',
                  'Current profile linked to the send audit. Traveller and recipient account references are distinct.',
                  [traveller],
                  profileColumns,
                )
              }
            >
              View linked traveller
            </Button>
          )}
          {trip && (
            <Button
              variant="outlined"
              onClick={() =>
                receipt(
                  'Linked journey',
                  'Journey linked to this recorded send. Journey start may fall outside the selected send-date interval.',
                  [trip],
                  tripColumns,
                )
              }
            >
              View linked journey
            </Button>
          )}
        </div>
      ),
    });
  };
  const briefingChart = (readOnly = false) => {
    const counts = days.map(
      (day) =>
        briefings.filter((b) => b.kind === 'Briefing' && b.time.slice(0, 10) === day.day).length,
    );
    return (
      <>
        <LineChart
          height={250}
          skipAnimation
          xAxis={[
            {
              scaleType: 'point',
              data: days.map((d) => d.day),
              tickLabelInterval: (_, i) => i % Math.max(1, Math.ceil(days.length / 6)) === 0,
              valueFormatter: (v) => String(v).slice(5),
            },
          ]}
          yAxis={[{ min: 0, tickMinStep: 1 }]}
          series={[
            {
              data: counts,
              label: 'Recorded briefing sends',
              color: palette[0],
              showMark: days.length === 1,
            },
          ]}
          onAxisClick={
            readOnly
              ? undefined
              : (_, item) => {
                  if (item?.dataIndex === undefined) return;
                  const r = recordsFor('briefings');
                  receipt(
                    'Briefing sends for UTC day',
                    'Recorded briefing sends; reminders excluded. No delivery inference.',
                    r.rows.filter((b) => b.time.slice(0, 10) === days[item.dataIndex!].day),
                    r.columns,
                  );
                }
          }
        />
        <Typography variant="caption">
          Recorded briefing sends per UTC day. Reminders are excluded.
        </Typography>
      </>
    );
  };
  const reportContent = (w: Widget): ReactNode => {
    if (w.kind === 'metric')
      return (
        <Typography variant="h3" component="p">
          {typeof metricValue(w.id) === 'number' ? n(Number(metricValue(w.id))) : metricValue(w.id)}
        </Typography>
      );
    if (w.kind === 'allocation')
      return (
        <Typography>
          {n(accountData.enabled.length)} enabled / {n(customer.limit)} configured ·{' '}
          {n(Math.max(0, customer.limit - accountData.enabled.length))} remaining ·{' '}
          {n(Math.max(0, accountData.enabled.length - customer.limit))} over allocation.
        </Typography>
      );
    if (w.id === 'briefing-trend') return briefingChart(true);
    if (w.kind === 'chart') return chart(w, true);
    if (w.id === 'feed-evidence') {
      const receipts = feedReceiptsFor(customer);
      const rows = [...new Set(receipts.map((r) => r.provider))].map((provider) => {
        const s = feedSummary(
          receipts,
          customer.id,
          provider,
          cadences[`${customer.id}:${provider}`] ?? null,
          asOf,
        );
        return {
          id: provider,
          provider,
          lastReceived: s.latest?.receivedAt,
          status: s.status,
          expected:
            s.expectedHours === null
              ? 'Not configured'
              : `${s.expectedHours} hours (local assumption)`,
        };
      });
      return (
        <ReadOnlyRecords
          rows={rows}
          columns={[
            { field: 'provider', headerName: 'Source' },
            { field: 'lastReceived', headerName: 'Last received' },
            { field: 'status', headerName: 'Review status' },
            { field: 'expected', headerName: 'Expected interval' },
          ]}
        />
      );
    }
    if (w.kind === 'records') {
      const r = recordsFor(w.id);
      return <ReadOnlyRecords rows={prepareRows(r.rows)} columns={r.columns} />;
    }
    if (w.kind === 'map') {
      const { points, unmapped } = buildFootprint(data);
      return (
        <>
          <EvidenceMap
            readOnly
            items={points.map((p) => ({
              id: p.location,
              name: p.location,
              lat: p.lat,
              lng: p.lng,
            }))}
          />
          <ReadOnlyRecords
            rows={points.map((p) => ({
              id: p.location,
              location: p.location,
              trips: p.trips.length,
              checks: p.checkins.length,
              sos: p.sos.length,
            }))}
            columns={[
              { field: 'location', headerName: 'Location' },
              { field: 'trips', headerName: 'Trips' },
              { field: 'checks', headerName: 'Check-ins' },
              { field: 'sos', headerName: 'SOS' },
            ]}
          />
          <Typography variant="caption">
            {unmapped} records without usable map position. Public city centres only.
          </Typography>
        </>
      );
    }
    if (w.kind === 'alertMap')
      return (
        <>
          <EvidenceMap
            readOnly
            items={nearAlerts.map((a) => ({
              id: a.id,
              name: a.alert,
              lat: places[a.location]?.lat ?? null,
              lng: places[a.location]?.lng ?? null,
            }))}
          />
          <ReadOnlyRecords rows={nearAlerts} columns={nearbyAlertColumns} />
        </>
      );
    if (w.kind === 'integration') {
      const integration = integrations.find((i) =>
        i.type.startsWith(w.id.split('-')[1].toUpperCase()),
      );
      return (
        <Typography>
          {integration
            ? `${integration.provider} · ${integration.status} · ${integration.detail}`
            : 'No configuration evidence'}
        </Typography>
      );
    }
    return (
      <Typography>
        Suggested account review topic:{' '}
        {customer.id === 'acme'
          ? `Acme Corporation has ${n(accountData.enabled.length)} enabled accounts against a configured limit of ${n(customer.limit)}. Discuss expected user growth at the next review.`
          : customer.focus}
      </Typography>
    );
  };
  const captureOverview = () =>
    setReport({
      customer: customer.name,
      ...range,
      audience: audienceLabel(audience),
      asOf,
      generatedAt: new Date().toISOString(),
      cards: visible.map((w) => ({
        id: w.id,
        title: w.title,
        definition: `${w.definition} ${accountWide(w) ? 'Account-wide; audience filters do not apply.' : ''}`,
        wide: w.width !== 'small',
        content: reportContent(w),
      })),
    });

  const renderWidget = (w: Widget): ReactNode => {
    if (w.kind === 'metric')
      return (
        <ButtonBase
          className="widget-metric"
          onClick={() => openWidget(w)}
          aria-label={`View ${w.title} details`}
        >
          <div className="widget-value">
            <strong aria-live="polite">
              {typeof metricValue(w.id) === 'number'
                ? n(Number(metricValue(w.id)))
                : metricValue(w.id)}
            </strong>
            {icon(w.id)}
          </div>
          {w.id === 'limit' && (
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (accountData.enabled.length / customer.limit) * 100)}
              sx={{ height: 5, borderRadius: 1 }}
            />
          )}
          <div className="widget-metric-note">
            <Typography variant="caption">
              {w.current
                ? `Current · ${w.id === 'limit' ? `${((accountData.enabled.length / customer.limit) * 100).toFixed(1)}% used` : 'independent of selected dates'}`
                : accountWide(w)
                  ? 'Account-wide · selected reporting period'
                  : 'Selected reporting period'}
            </Typography>
            <ArrowForwardIcon fontSize="small" />
          </div>
        </ButtonBase>
      );
    if (w.kind === 'allocation')
      return (
        <>
          <div className="allocation-cells">
            {['enabled', 'disabled', 'remaining', 'overage'].map((id) => (
              <ButtonBase
                key={id}
                onClick={() => openWidget(dashboardWidgets.find((w) => w.id === id)!)}
              >
                <strong>{n(Number(metricValue(id)))}</strong>
                <span>{dashboardWidgets.find((w) => w.id === id)!.title}</span>
              </ButtonBase>
            ))}
          </div>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, (accountData.enabled.length / customer.limit) * 100)}
            sx={{ my: 2, height: 7, borderRadius: 1 }}
          />
          <Typography variant="caption">
            Current · {n(accountData.enabled.length)} / {n(customer.limit)} ·{' '}
            {accountData.enabled.length > customer.limit
              ? 'Over allocation'
              : accountData.enabled.length / customer.limit >= 0.85
                ? 'Near limit'
                : 'Within allocation'}{' '}
            · {((accountData.enabled.length / customer.limit) * 100).toFixed(1)}% used
          </Typography>
        </>
      );
    if (w.id === 'feed-evidence')
      return (
        <FeedEvidence
          customer={customer}
          asOf={asOf}
          cadences={cadences}
          onCadence={(provider, value) => {
            const next = { ...cadences, [`${customer.id}:${provider}`]: value };
            setCadences(next);
            saveLocal('hula-feed-cadences-v1', next);
          }}
          onRecords={(rows) =>
            receipt(
              'Feed receipt evidence',
              'Account-wide history through the snapshot; selected dates and audience filters do not apply.',
              rows,
              feedColumns,
              true,
            )
          }
        />
      );
    if (w.id === 'briefing-trend') return briefingChart();
    if (w.kind === 'chart') return chart(w);
    if (w.kind === 'records') {
      const r = recordsFor(w.id);
      return (
        <>
          {evidenceRecords(customer, range, audience, w.id, asOf) && (
            <Typography variant="caption" component="p" sx={{ mb: 2 }}>
              {w.definition}
            </Typography>
          )}
          <DashboardRecords
            key={`${scopeKey}-${w.id}`}
            title={w.title}
            rows={prepareRows(r.rows)}
            columns={r.columns}
            definition={w.definition}
            accountWide={accountWide(w)}
            onRow={(row) => inspectRow(w, row, r.columns)}
          />
        </>
      );
    }
    if (w.kind === 'map')
      return (
        <Suspense fallback={<Typography>Loading traveller footprint…</Typography>}>
          <TravellerFootprint
            key={scopeKey}
            data={data}
            range={range}
            onTravel={() => setTab(2)}
            onReceipts={(point, kind, scope) =>
              receipt(
                `${kind === 'trips' ? 'Journeys' : kind === 'checkins' ? 'Check-ins' : 'SOS'} · ${point.location}`,
                scope,
                kind === 'trips' ? point.trips : kind === 'checkins' ? point.checkins : point.sos,
                kind === 'trips' ? tripColumns : kind === 'checkins' ? checkColumns : sosColumns,
              )
            }
          />
        </Suspense>
      );
    if (w.kind === 'alertMap')
      return (
        <Suspense fallback={<Typography>Loading alert map…</Typography>}>
          <AlertMap
            key={scopeKey}
            evidence={nearAlerts}
            onRecords={(rows) =>
              receipt(
                w.title,
                w.definition,
                rows.map(({ coordinates, ...row }) => ({
                  ...row,
                  eventStart: row.date,
                  eventEnd: new Date(
                    Date.parse(row.date.replace(/Z$/, '') + 'Z') + 12 * 60 * 60 * 1000,
                  ).toISOString(),
                  coverage: coordinates ? 'Mapped' : 'Unmapped',
                })),
                nearbyAlertColumns,
              )
            }
          />
        </Suspense>
      );
    if (w.kind === 'integration') {
      const type = w.id.split('-')[1].toUpperCase();
      const integration = integrations.find((i) => i.type.startsWith(type));
      return integration ? (
        <div className="integration-detail">
          <Typography variant="h6">{integration.provider}</Typography>
          <Chip size="small" label={integration.status} />
          <Typography>
            Last observed: {fmtDate(integration.lastUsed)} · {integration.detail}
          </Typography>
          <Button onClick={() => receipt(w.title, w.definition, [integration], integrationColumns)}>
            Inspect integration
          </Button>
        </div>
      ) : (
        <Alert severity="info">No integration is available.</Alert>
      );
    }
    return (
      <Alert severity="info">
        <strong>Suggested account review topic</strong>
        <br />
        {customer.id === 'acme'
          ? `Acme Corporation has ${n(accountData.enabled.length)} enabled accounts against a configured limit of ${n(customer.limit)}. Discuss expected user growth at the next review.`
          : customer.focus}
      </Alert>
    );
  };
  const dragEnd = ({ active, over }: DragEndEvent) => {
    setDragSize(undefined);
    if (over && active.id !== over.id) {
      const start = layout.indexOf(String(active.id)),
        end = layout.indexOf(String(over.id));
      if (start >= 0 && end >= 0) persist(arrayMove(layout, start, end));
    }
  };
  return (
    <ExportContext.Provider
      value={{
        customer: customerId ? customer.name : 'Fictional customer portfolio',
        ...range,
        asOf,
        snapshotId: `${customerId || 'portfolio'}-r${simulation.revision}`,
        audience: audienceLabel(audience),
      }}
    >
      <div
        className="app-shell"
        style={{ '--chrome-height': `${chromeHeight}px` } as CSSProperties}
      >
        <a className="skip-link" href="#main">
          Skip to dashboard
        </a>
        <div className="app-chrome" ref={chromeRef}>
          <header className="app-header">
            <button
              className="brand"
              aria-label="Serenity Local overview"
              onClick={() => choose('')}
            >
              <img src={`${import.meta.env.BASE_URL}serenity-brand.svg`} alt="Serenity Local" />
            </button>
            <span className="brand-divider" />
            <span className="platform-label">HULA</span>
            <span className="prototype-tag">EVENT PROTOTYPE</span>
            <button
              className="profile"
              onClick={() =>
                setDetail({
                  title: 'Account manager',
                  definition: 'Alex Morgan · Client Success',
                })
              }
            >
              <Avatar sx={{ width: 31, height: 31, fontSize: 12 }}>AM</Avatar>
              <span>
                <strong>Alex Morgan</strong>
                <small>Client Success</small>
              </span>
            </button>
          </header>
          <Alert severity="info" className="data-notice">
            All metrics use fictional account, activity, itinerary and location records. No real
            data is connected. Account status and configured allocation show the current mock
            snapshot.
          </Alert>
        </div>
        <nav className="rail" aria-label="Account tools">
          <Tooltip title="General Overview" placement="right">
            <IconButton aria-label="General Overview" onClick={() => choose('')}>
              <BusinessOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Metric definitions" placement="right">
            <IconButton
              aria-label="Metric definitions"
              onClick={() =>
                setDetail({
                  title: 'Metric definitions',
                  definition: 'Current status, period engagement and billing are distinct.',
                  content: (
                    <div className="metric-definitions">
                      {dashboardWidgets
                        .filter((w) => w.kind === 'metric')
                        .map((w) => (
                          <div key={w.id}>
                            <Typography fontWeight={600}>{w.title}</Typography>
                            <Typography>{w.definition}</Typography>
                          </div>
                        ))}
                    </div>
                  ),
                })
              }
            >
              <MenuBookIcon />
            </IconButton>
          </Tooltip>
          <div className="rail-bottom">
            <IconButton
              aria-label="About this prototype"
              onClick={() =>
                setDetail({
                  title: 'About this prototype',
                  definition: 'Serenity Local / HULA · Account Management Dashboard',
                  content: (
                    <>
                      <Typography>
                        Explore account engagement, travel, safety and integration evidence.
                        Preferences are saved in this browser. Maps use bundled public-domain
                        geography without external tile requests.
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
          </div>
        </nav>
        <main id="main" className="dashboard parity-dashboard">
          <div className="dashboard-banner">
            <Typography variant="h2" component="h1">
              Account Management Dashboard
            </Typography>
            <Typography color="text.secondary">
              Client usage, engagement and account review
            </Typography>
          </div>
          <div className="dashboard-page-body">
            <div className={`dashboard-filters${customerId ? '' : ' portfolio-filters'}`}>
              <div className="customer-column">
                <TextField
                  select
                  size="small"
                  label="Customer"
                  value={customerId || 'all'}
                  onChange={(e) => choose(e.target.value === 'all' ? '' : e.target.value)}
                >
                  <MenuItem value="all">General Overview</MenuItem>
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
                {customerId && (
                  <HealthControl
                    key={customerId}
                    customer={customer}
                    review={reviews[customerId] || normaliseReview(null)}
                    today={reviewToday}
                    policy={policies[customerId] || defaultPolicy()}
                    onChange={(value) => {
                      const next = { ...policies, [customerId]: value };
                      setPolicies(next);
                      saveLocal('hula-health-policies-v1', next);
                    }}
                  />
                )}
              </div>
              {customerId && (
                <>
                  <div className="reporting-date-controls">
                    <Typography variant="caption">
                      Reporting dates · UTC · up to 366 days
                    </Typography>
                    <div className="date-pickers">
                      <DesktopDatePicker
                        label="From (UTC)"
                        value={from}
                        onChange={(date) => setDates(date, to)}
                        maxDate={parseISO(SNAPSHOT)}
                        format="dd/MM/yyyy"
                        enableAccessibleFieldDOMStructure={false}
                        slotProps={{ textField: { size: 'small' } }}
                      />
                      <DesktopDatePicker
                        label="To (UTC)"
                        value={to}
                        onChange={(date) => setDates(from, date)}
                        maxDate={parseISO(SNAPSHOT)}
                        format="dd/MM/yyyy"
                        enableAccessibleFieldDOMStructure={false}
                        slotProps={{ textField: { size: 'small' } }}
                      />
                    </div>
                    <div className="range-presets">
                      {[1, 3, 6, 12].map((months) => (
                        <Button
                          key={months}
                          variant={preset === months ? 'contained' : 'text'}
                          aria-pressed={preset === months}
                          onClick={() => {
                            const next = presetRange(months);
                            setRange(next);
                            setFrom(parseISO(next.from));
                            setTo(parseISO(next.to));
                            setPreset(months);
                            setDetail(null);
                          }}
                        >
                          {months} {months === 1 ? 'Month' : 'Months'}
                        </Button>
                      ))}
                      {preset === null && <Typography variant="caption">Custom</Typography>}
                    </div>
                  </div>
                  <div className="refresh-controls">
                    <Button variant="outlined" disabled={!valid || refreshing} onClick={refresh}>
                      {refreshing ? 'Refreshing…' : 'Refresh metrics'}
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      Calculated {calculated}
                    </Typography>
                  </div>
                </>
              )}
            </div>
            {customerId && (
              <CustomerReview
                key={customerId}
                customer={customer}
                review={reviews[customerId] || normaliseReview(null)}
                today={reviewToday}
                onChange={(value) => {
                  const next = { ...reviews, [customerId]: value };
                  setReviews(next);
                  saveLocal(reviewStorageKey, next);
                }}
              />
            )}
            {customerId && (
              <AudienceFilters
                customer={customer}
                value={audience}
                onChange={(next) => {
                  setAudience(next);
                  setDetail(null);
                  setMapView(null);
                }}
              />
            )}
            {!customerId ? (
              <CustomerHealth
                customers={customers}
                policies={policies}
                reviews={reviews}
                today={reviewToday}
                onSelect={choose}
                onRefresh={refresh}
                refreshing={refreshing}
              />
            ) : (
              <>
                {!valid && (
                  <Alert severity="error">
                    Choose a non-empty reporting range of at most 366 days, ending no later than the
                    snapshot.
                  </Alert>
                )}
                <Tabs
                  value={tab}
                  onChange={(_, value) => setTab(value)}
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  aria-label="Account Management Dashboard tabs"
                  className="parity-tabs"
                >
                  {dashboardTabs.map((name, i) => (
                    <Tab key={name} label={name} id={`tab-${i}`} aria-controls={`panel-${i}`} />
                  ))}
                </Tabs>
                {valid && (
                  <>
                    <Alert severity="info" className="commercial-notice">
                      Commercial 365-day active-user definition to be validated separately.
                    </Alert>
                    {tab === 0 && (
                      <div className="catalogue-toolbar">
                        <Button variant="contained" onClick={() => setCatalogue(true)}>
                          Add cards
                        </Button>
                        <Button variant="outlined" onClick={() => persist([...defaultWidgets])}>
                          Reset to default
                        </Button>
                        <Button
                          variant="outlined"
                          disabled={!visible.length || refreshing}
                          onClick={captureOverview}
                        >
                          Export Overview / PDF
                        </Button>
                        <Typography variant="caption">
                          Drag a handle or focus it and press Space, then use the arrow keys. Layout
                          for {customer.name} is saved in this browser.
                        </Typography>
                      </div>
                    )}
                    <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
                      {!visible.length && (
                        <Alert
                          severity="info"
                          action={<Button onClick={() => setCatalogue(true)}>Add cards</Button>}
                        >
                          Your Overview is empty. Add cards or reset to the default layout.
                        </Alert>
                      )}
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={({ active }) => {
                          const node = Array.from(grid.current?.children || []).find(
                            (el) => (el as HTMLElement).dataset.widgetId === active.id,
                          );
                          const rect = node?.getBoundingClientRect();
                          if (rect) setDragSize({ width: rect.width, height: rect.height });
                        }}
                        onDragCancel={() => setDragSize(undefined)}
                        onDragEnd={dragEnd}
                      >
                        <SortableContext
                          items={visible.map((w) => w.id)}
                          strategy={rectSortingStrategy}
                        >
                          <div ref={grid} className="dashboard-widget-grid">
                            {visible.map((w) => (
                              <WidgetFrame
                                key={w.id}
                                widget={w}
                                overview={tab === 0}
                                accountWide={accountWide(w)}
                                dragSize={dragSize}
                                onRemove={() => persist(layout.filter((id) => id !== w.id))}
                                onInfo={() =>
                                  setDetail({ title: w.title, definition: w.definition })
                                }
                              >
                                {renderWidget(w)}
                              </WidgetFrame>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  </>
                )}
              </>
            )}
            <footer className="dashboard-footer">
              Serenity Local / HULA · Snapshot {SNAPSHOT}
            </footer>
          </div>
        </main>
        <Dialog
          open={catalogue}
          onClose={() => setCatalogue(false)}
          fullWidth
          maxWidth="sm"
          aria-labelledby="catalogue-title"
        >
          <DialogTitle id="catalogue-title">
            Choose Overview cards
            <IconButton
              aria-label="Close card catalogue"
              onClick={() => setCatalogue(false)}
              sx={{ float: 'right' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              All cards and panels remain available on their source tabs. Changes are saved in this
              browser.
            </Typography>
            {(['users', 'travel', 'safety', 'integrations'] as const).map((group, i) => (
              <Box key={group} sx={{ mb: 3 }}>
                <Typography variant="h6" component="h2">
                  {dashboardTabs[i + 1]}
                </Typography>
                {dashboardWidgets
                  .filter((w) => w.tab === group)
                  .map((w) => (
                    <FormControlLabel
                      key={w.id}
                      sx={{ display: 'flex', alignItems: 'flex-start', py: 0.5 }}
                      control={
                        <Checkbox
                          checked={layout.includes(w.id)}
                          onChange={(_, checked) =>
                            persist(
                              checked ? [...layout, w.id] : layout.filter((id) => id !== w.id),
                            )
                          }
                        />
                      }
                      label={<Typography>{w.title}</Typography>}
                    />
                  ))}
              </Box>
            ))}
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={() => setCatalogue(false)}>
              Done
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={Boolean(detail)}
          onClose={() => setDetail(null)}
          fullWidth
          maxWidth={detail?.rows ? 'lg' : 'sm'}
          aria-labelledby="receipt-title"
        >
          <DialogTitle id="receipt-title">
            {detail?.title}
            <IconButton
              sx={{ float: 'right' }}
              aria-label="Close details"
              onClick={() => setDetail(null)}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }} color="text.secondary">
              {detail?.definition}
            </Typography>
            {detail?.accountWide && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Account-wide evidence. Audience filters are not applied.
              </Alert>
            )}
            {detail?.rows && detail.columns && (
              <DashboardRecords
                key={`${detail.title}-${customerId}`}
                title={detail.title}
                rows={detail.rows}
                columns={detail.columns}
                definition={detail.definition}
                accountWide={detail.accountWide}
                onRow={(row) =>
                  inspectRow(
                    {
                      id: row.travellerUserId
                        ? 'briefing-records'
                        : row.ruleId
                          ? 'push-audits'
                          : row.acknowledgement
                            ? 'sos-records'
                            : '',
                      title: detail.title,
                      definition: detail.definition,
                      current: detail.accountWide,
                    } as Widget,
                    row,
                    detail.columns!,
                  )
                }
              />
            )}
            {detail?.content}
          </DialogContent>
        </Dialog>
        <OverviewReport capture={report} onClose={() => setReport(null)} />
        <Dialog
          open={Boolean(mapView)}
          onClose={() => setMapView(null)}
          fullWidth
          maxWidth="md"
          aria-labelledby="evidence-map-title"
        >
          <DialogTitle id="evidence-map-title">{mapView?.title}</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>{mapView?.description}</Typography>
            {mapView && <EvidenceMap items={mapView.items} />}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMapView(null)}>Close map</Button>
          </DialogActions>
        </Dialog>
        <Snackbar
          open={Boolean(toast)}
          message={toast}
          autoHideDuration={4500}
          onClose={() => setToast('')}
        />
      </div>
    </ExportContext.Provider>
  );
}
