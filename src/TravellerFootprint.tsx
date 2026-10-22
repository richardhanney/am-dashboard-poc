import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  IconButton,
  InputAdornment,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SearchIcon from '@mui/icons-material/Search';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import L from 'leaflet';
import type { GeoJsonObject } from 'geojson';
import { format, parseISO } from 'date-fns';
import 'leaflet/dist/leaflet.css';
import world from './assets/world-countries.json';
import { Info, Panel, riskColours } from './components';
import { fmtDate, n, type Selected, type Range } from './data';
import {
  buildFootprint,
  clusterFootprint,
  footprintCount,
  footprintWindows,
  filterJourneyOrigin,
  groupFootprintCountries,
  journeyLinks,
  riskOrder,
  sliceFootprint,
  type FootprintPoint,
  type FootprintReceipt,
  type FootprintRisk,
  type FootprintView,
} from './footprint';

type Props = {
  data: Selected;
  range: Range;
  onReceipts: (point: FootprintPoint, kind: FootprintReceipt, scope: string) => void;
  onTravel: () => void;
};
const shortDate = (date: string) => format(parseISO(date), 'dd MMM');
const countryName = (name: string) =>
  name === 'United States of America' ? 'United States' : name;
const motion = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function TravellerFootprint({ data, range, onReceipts, onTravel }: Props) {
  const [view, setView] = useState<FootprintView>('destinations');
  const [location, setLocation] = useState('');
  const [risk, setRisk] = useState<FootprintRisk>('all');
  const [windowIndex, setWindowIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [search, setSearch] = useState('');
  const [showLinks, setShowLinks] = useState(true);
  const [originCountry, setOriginCountry] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const countries = useRef<L.GeoJSON | null>(null);
  const cameraFramed = useRef(false);
  const windows = useMemo(() => footprintWindows(range), [range]);
  const interval = windowIndex === null ? null : windows[windowIndex];
  const activeRisk = view === 'risk' ? risk : 'all';
  const journeyMode = showLinks && view !== 'safety';
  const activeOrigin = journeyMode ? originCountry : null;
  const periodData = useMemo(
    () => sliceFootprint(data, interval, activeRisk),
    [data, interval, activeRisk],
  );
  const localData = useMemo(
    () => filterJourneyOrigin(periodData, activeOrigin),
    [periodData, activeOrigin],
  );
  // Camera framing follows the date/risk selection, never an origin-country click.
  const framePoints = useMemo(
    () => buildFootprint(periodData).points.filter((point) => footprintCount(point, view) > 0),
    [periodData, view],
  );
  const countryLinks = useMemo(() => journeyLinks(framePoints), [framePoints]);
  const { points, unmapped } = useMemo(() => buildFootprint(localData), [localData]);
  const visiblePoints = useMemo(
    () =>
      points
        .filter((point) => footprintCount(point, view) > 0)
        .sort(
          (a, b) =>
            footprintCount(b, view) - footprintCount(a, view) ||
            a.location.localeCompare(b.location),
        ),
    [points, view],
  );
  const selected = visiblePoints.find((point) => point.location === location) || visiblePoints[0];
  // Keep every country available for successive clicks, including empty-origin selections.
  const explorationPoints = journeyMode ? framePoints : visiblePoints;
  const ranked = explorationPoints.filter((point) =>
    `${point.location} ${point.country}`.toLowerCase().includes(search.toLowerCase()),
  );
  const recordCount = visiblePoints.reduce((sum, point) => sum + footprintCount(point, view), 0);
  const arrivalCount = activeOrigin
    ? periodData.trips.filter((trip) => trip.country === activeOrigin).length
    : 0;
  const bucketCounts = useMemo(
    () =>
      windows.map((bucket) => {
        const slice = filterJourneyOrigin(sliceFootprint(data, bucket, activeRisk), activeOrigin);
        return view === 'safety' ? slice.checkins.length + slice.sos.length : slice.trips.length;
      }),
    [data, windows, activeRisk, activeOrigin, view],
  );
  const riskSource = useMemo(
    () => filterJourneyOrigin(sliceFootprint(data, interval), activeOrigin),
    [data, interval, activeOrigin],
  );
  const allLinks = useMemo(() => journeyLinks(visiblePoints), [visiblePoints]);
  const selectedLinks = allLinks.filter((link) => link.destination === selected?.location);
  const destinationCountries = useMemo(
    () => new Set(allLinks.map((link) => link.destinationCountry)),
    [allLinks],
  );
  const recentTrips = selected
    ? [...selected.trips].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 2)
    : [];
  const unit = view === 'safety' ? 'safety records' : 'trips';

  const selectCountry = useCallback((country: string) => {
    setOriginCountry(country);
    setLocation('');
    setSearch('');
  }, []);

  const focusPoint = useCallback(
    (point: FootprintPoint) => {
      if (journeyMode) {
        selectCountry(point.country);
        return;
      }
      setLocation(point.location);
      const links = showLinks && view !== 'safety' ? journeyLinks([point]) : [];
      const bounds: L.LatLngTuple[] = [[point.lat, point.lng], ...links.map((link) => link.start)];
      map.current?.fitBounds(bounds, {
        padding: [55, 55],
        maxZoom: 5,
        animate: motion(),
        duration: 0.55,
      });
    },
    [showLinks, view, journeyMode, selectCountry],
  );

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      center: [20, 25],
      zoom: 1,
      minZoom: 0,
      maxZoom: 12,
      scrollWheelZoom: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      maxBounds: [
        [-75, -180],
        [85, 180],
      ],
      maxBoundsViscosity: 0.8,
    });
    map.current = instance;
    instance.zoomControl.setPosition('bottomleft');
    instance.createPane('worldBase').style.zIndex = '150';
    countries.current = L.geoJSON(world as GeoJsonObject, {
      pane: 'worldBase',
      style: { color: '#c1cbc7', weight: 0.7, fillColor: '#f6f3ec', fillOpacity: 1 },
      attribution: '<a href="https://www.naturalearthdata.com/">Natural Earth</a>',
    }).addTo(instance);
    const observer = new ResizeObserver(() => instance.invalidateSize({ pan: false }));
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
      countries.current = null;
      cameraFramed.current = false;
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (windowIndex !== null && windowIndex >= windows.length - 1) setPlaying(false);
      else setWindowIndex(windowIndex === null ? 0 : windowIndex + 1);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [playing, windowIndex, windows.length]);

  useEffect(() => {
    if (journeyMode && cameraFramed.current) return;
    if (framePoints.length)
      map.current?.fitBounds(
        framePoints.map((point) => [point.lat, point.lng] as L.LatLngTuple),
        { padding: [45, 45], maxZoom: 4, animate: false },
      );
    else map.current?.setView([20, 25], 1, { animate: false });
    cameraFramed.current = true;
  }, [framePoints, journeyMode]);

  useEffect(() => {
    const geo = countries.current;
    if (!geo) return;
    geo.eachLayer((layer) => {
      const polygon = layer as L.Polygon & { feature: { properties: { name: string } } };
      const name = countryName(polygon.feature.properties.name);
      const entries = framePoints.filter((point) => point.country === name);
      const count = entries.reduce((sum, point) => sum + footprintCount(point, view), 0);
      const outgoing = countryLinks.filter((link) => link.originCountry === name);
      const outgoingCount = outgoing.reduce((sum, link) => sum + link.count, 0);
      const isOrigin = journeyMode && activeOrigin === name;
      const isDestination = journeyMode && activeOrigin !== null && destinationCountries.has(name);
      const highlighted =
        journeyMode && activeOrigin !== null ? isOrigin : selected?.country === name;
      const interactive = journeyMode || count > 0;
      const activate = () => {
        if (journeyMode) {
          selectCountry(name);
        } else focusPoint(entries[0]);
      };
      const style = {
        color: highlighted ? '#9e6b1f' : isDestination ? '#486f83' : '#c1cbc7',
        weight: highlighted ? 2 : isDestination ? 1.4 : 0.7,
        fillColor: highlighted
          ? '#e2c88f'
          : isDestination
            ? '#bbd5d0'
            : activeOrigin
              ? '#f6f3ec'
              : count || (outgoingCount && journeyMode)
                ? '#e7dfcb'
                : '#f6f3ec',
        fillOpacity: 1,
      };
      polygon.setStyle(style);
      const element = polygon.getElement();
      if (element instanceof SVGElement) {
        element.style.pointerEvents = interactive ? 'auto' : 'none';
        element.setAttribute('role', interactive ? 'button' : 'presentation');
        if (interactive) {
          element.setAttribute(
            'aria-label',
            journeyMode ? `Show journeys from ${name}` : `Explore ${name} destinations`,
          );
          element.setAttribute('aria-pressed', String(highlighted));
          element.setAttribute('tabindex', '0');
          element.onkeydown = (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              activate();
            }
          };
        } else {
          element.removeAttribute('aria-label');
          element.removeAttribute('aria-pressed');
          element.removeAttribute('tabindex');
          element.onkeydown = null;
        }
      }
      polygon.off('mouseover mouseout click');
      polygon.unbindTooltip();
      if (interactive) {
        const label = document.createElement('span');
        label.textContent = journeyMode
          ? `${name} · ${n(outgoingCount)} outbound trips · click to highlight journeys`
          : `${name} · ${n(count)} ${unit} · click to explore`;
        polygon.bindTooltip(label, { sticky: true });
        polygon.on('mouseover', () => polygon.setStyle({ fillColor: '#d4bf8c', weight: 1.5 }));
        polygon.on('mouseout', () => polygon.setStyle(style));
        polygon.on('click', activate);
      }
    });
  }, [
    framePoints,
    countryLinks,
    selected?.country,
    unit,
    view,
    focusPoint,
    journeyMode,
    activeOrigin,
    destinationCountries,
    selectCountry,
  ]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !showLinks || view === 'safety') return;
    const layer = L.layerGroup().addTo(instance);
    for (const link of allLinks) {
      const highlighted = activeOrigin !== null || link.destination === selected?.location;
      L.polyline(link.path, {
        color:
          activeOrigin && link.destination !== selected?.location
            ? '#486f83'
            : highlighted
              ? '#9e6b1f'
              : '#486f83',
        weight: highlighted ? 2.5 : 1.2,
        opacity: highlighted ? 0.9 : 0.3,
        dashArray: highlighted ? undefined : '4 7',
        interactive: false,
      }).addTo(layer);
    }
    for (const origin of new Set(allLinks.map((link) => link.origin))) {
      const links = allLinks.filter((link) => link.origin === origin);
      const marker = L.circleMarker(links[0].start, {
        radius: 4,
        color: '#fff',
        weight: 2,
        fillColor: '#102231',
        fillOpacity: 1,
      })
        .bindTooltip(
          `${origin} · ${n(links.reduce((sum, link) => sum + link.count, 0))} recorded journey starts`,
        )
        .addTo(layer);
      marker.on('click', () => selectCountry(links[0].originCountry));
      const element = marker.getElement();
      if (element instanceof SVGElement) {
        element.setAttribute('role', 'button');
        element.setAttribute('tabindex', '0');
        element.setAttribute('aria-label', `Show journeys from ${origin} origin`);
        element.onkeydown = (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectCountry(links[0].originCountry);
          }
        };
      }
    }
    return () => {
      layer.remove();
    };
  }, [allLinks, selected?.location, showLinks, view, activeOrigin, selectCountry]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const layer = L.layerGroup().addTo(instance);
    const draw = () => {
      const activeLabel = document.activeElement?.getAttribute('aria-label');
      layer.clearLayers();
      const groups = journeyMode
        ? groupFootprintCountries(framePoints)
        : clusterFootprint(
            visiblePoints,
            (point) => instance.project([point.lat, point.lng]),
            instance.getZoom() < 7 ? 40 : 0,
          );
      const max = Math.max(
        1,
        ...groups.map((group) =>
          group.reduce((sum, point) => sum + footprintCount(point, view), 0),
        ),
      );
      const placed: { point: L.Point; size: number }[] = [];
      for (const group of groups) {
        const total = group.reduce((sum, point) => sum + footprintCount(point, view), 0);
        const clustered = group.length > 1;
        const chosen = journeyMode
          ? group[0].country === activeOrigin
          : group.some((point) => point.location === selected?.location);
        const size = Math.round(28 + 22 * Math.sqrt(total / max));
        const worstRisk = riskOrder
          .filter((risk) => group.some((point) => point.risk === risk))
          .at(-1);
        const colour =
          journeyMode && activeOrigin && !chosen
            ? destinationCountries.has(group[0].country)
              ? '#486f83'
              : '#89918f'
            : view === 'risk'
              ? worstRisk
                ? riskColours[worstRisk]
                : '#7b858b'
              : view === 'safety'
                ? group.some((point) => point.sos.length)
                  ? '#9a4e50'
                  : '#486f83'
                : '#9e6b1f';
        const names = group.map((point) => point.location).join(', ');
        const label = journeyMode
          ? `Show journeys from ${group[0].country}. ${n(total)} destination ${total === 1 ? 'trip' : 'trips'} in this country.`
          : clustered
            ? `Zoom to ${group.length} locations: ${names}. ${n(total)} ${unit}.`
            : `${names}: ${n(total)} ${unit}. Select location.`;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `footprint-marker${clustered ? ' footprint-cluster' : ''}${chosen ? ' footprint-marker-selected' : ''}`;
        button.style.setProperty('--marker-colour', colour);
        button.style.width = `${size}px`;
        button.style.height = `${size}px`;
        button.textContent = n(total);
        button.setAttribute('aria-label', label);
        button.setAttribute('aria-pressed', String(chosen));
        L.DomEvent.disableClickPropagation(button);
        L.DomEvent.on(button, 'click', () => {
          if (journeyMode) {
            selectCountry(group[0].country);
          } else if (clustered) {
            const bounds = L.latLngBounds(
              group.map((point) => [point.lat, point.lng] as L.LatLngTuple),
            );
            instance.setView(
              bounds.getCenter(),
              Math.max(
                instance.getZoom() + 1,
                Math.min(8, instance.getBoundsZoom(bounds, false, L.point(90, 90))),
              ),
              { animate: false },
            );
          } else focusPoint(group[0]);
        });
        const anchor: L.LatLngTuple = [
          group.reduce((sum, point) => sum + point.lat, 0) / group.length,
          group.reduce((sum, point) => sum + point.lng, 0) / group.length,
        ];
        let position = L.latLng(anchor);
        if (journeyMode) {
          const centre = instance.project(position);
          let candidate = centre;
          // Separate nearby country buttons instead of combining them into a zoom cluster.
          for (
            let attempt = 1;
            attempt <= 80 &&
            placed.some((other) => candidate.distanceTo(other.point) < (size + other.size) / 2 + 6);
            attempt++
          ) {
            const radius = Math.ceil(attempt / 8) * (size + 8);
            const angle = ((attempt % 8) * Math.PI) / 4;
            candidate = centre.add(L.point(Math.cos(angle) * radius, Math.sin(angle) * radius));
          }
          placed.push({ point: candidate, size });
          position = instance.unproject(candidate);
          if (candidate.distanceTo(centre) > 1) {
            L.polyline([anchor, position], {
              color: '#9d9482',
              weight: 1,
              opacity: 0.65,
              interactive: false,
            }).addTo(layer);
          }
        }
        const marker = L.marker(position, {
          icon: L.divIcon({
            html: button,
            className: 'footprint-pin',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          }),
          keyboard: false,
          zIndexOffset: chosen ? 200 : 0,
        }).addTo(layer);
        const tooltip = document.createElement('span');
        tooltip.textContent = journeyMode
          ? `${group[0].country} · ${n(total)} destination ${total === 1 ? 'trip' : 'trips'} · click for outgoing journeys`
          : chosen
            ? `${selected!.location}${clustered ? ` + ${group.length - 1} ${group.length === 2 ? 'location' : 'locations'}` : ''} · ${n(total)} ${unit}`
            : names;
        marker.bindTooltip(tooltip, {
          permanent: chosen,
          direction: 'top',
          offset: [0, -size / 2],
          className: chosen ? 'footprint-spotlight-label' : '',
        });
        if (activeLabel === label) button.focus({ preventScroll: true });
      }
    };
    draw();
    instance.on('zoomend', draw);
    return () => {
      instance.off('zoomend', draw);
      layer.remove();
    };
  }, [
    visiblePoints,
    framePoints,
    view,
    selected,
    unit,
    focusPoint,
    journeyMode,
    activeOrigin,
    selectCountry,
    destinationCountries,
  ]);

  const resetMap = () => {
    setOriginCountry(null);
    setLocation('');
    setSearch('');
    if (framePoints.length)
      map.current?.fitBounds(
        framePoints.map((point) => [point.lat, point.lng] as L.LatLngTuple),
        { padding: [45, 45], maxZoom: 4, animate: false },
      );
    else map.current?.setView([20, 25], 1, { animate: false });
  };
  const stepDestination = (step: number) => {
    if (journeyMode) {
      const groups = groupFootprintCountries(explorationPoints);
      if (!groups.length) return;
      const index = groups.findIndex((group) => group[0].country === activeOrigin);
      selectCountry(groups[(index + step + groups.length) % groups.length][0].country);
      return;
    }
    if (!selected || !visiblePoints.length) return;
    focusPoint(
      visiblePoints[
        (visiblePoints.indexOf(selected) + step + visiblePoints.length) % visiblePoints.length
      ],
    );
  };
  const chooseWindow = (index: number | null) => {
    setPlaying(false);
    setWindowIndex(index);
  };
  const showReceipts = (kind: FootprintReceipt) => {
    if (!selected) return;
    setPlaying(false);
    const window = interval || range;
    const scope = `Map window: ${fmtDate(window.from)} — ${fmtDate(window.to)}${activeRisk !== 'all' ? ` · ${activeRisk === 'higher' ? 'High + severe' : activeRisk} illustrative trip risk` : ''}${activeOrigin ? (kind === 'trips' ? ` · Journeys originating in ${activeOrigin}` : ` · Destination-location records, not attributed to a journey origin`) : ''}`;
    onReceipts(selected, kind, scope);
  };

  return (
    <Panel
      title="Traveller footprint"
      subtitle="Follow the journeys. Explore the exposure. Open the evidence."
      action={
        <Info text="Fictional itinerary destinations and safety records at approximate city centres, not live traveller positions. With Journey links on, countries, bubbles and location controls select the recorded itinerary origin country without moving the map, show only its outgoing journeys and highlight their destination countries. Bubbles remain available for switching countries and count destination trips before origin filtering, not outgoing trips. Origin is not a traveller's home country or nationality. Country shading is not nationwide risk. Safety metrics are location records, not evidence of which journey they belong to. Timeline, origin and risk filters apply only to this explorer; headline cards retain the full selected period." />
      }
    >
      <div className="footprint-toolbar">
        <ToggleButtonGroup
          value={view}
          exclusive
          size="small"
          aria-label="Map view"
          onChange={(_, value: FootprintView | null) => {
            if (value) setView(value);
          }}
        >
          <ToggleButton value="destinations">Destinations</ToggleButton>
          <ToggleButton value="risk">Risk exposure</ToggleButton>
          <ToggleButton value="safety">Safety activity</ToggleButton>
        </ToggleButtonGroup>
        <div className="footprint-tools">
          {view !== 'safety' && (
            <ToggleButton
              size="small"
              value="links"
              selected={showLinks}
              onChange={() => setShowLinks(!showLinks)}
            >
              <FlightTakeoffIcon />
              Journey links
            </ToggleButton>
          )}
        </div>
      </div>
      <div className="footprint-context">
        <strong>
          {n(recordCount)} {unit}
          <span> across {visiblePoints.length} locations</span>
        </strong>
        <span>
          {interval
            ? `${fmtDate(interval.from)} — ${fmtDate(interval.to)} · Map interval`
            : 'Whole selected period'}
          {activeRisk !== 'all'
            ? ` · ${activeRisk === 'higher' ? 'High + severe' : activeRisk} risk`
            : ''}
        </span>
      </div>
      {journeyMode && (
        <div className="footprint-origin-filter" role="status">
          <div>
            <strong>
              {activeOrigin
                ? `Journeys from ${activeOrigin}`
                : 'Explore journeys by origin country'}
            </strong>
            <span>
              {activeOrigin
                ? `${n(recordCount)} trips · ${destinationCountries.size} destination countries`
                : 'Click any country or bubble to highlight its outgoing journeys without zooming.'}
            </span>
          </div>
          <div className="footprint-origin-legend">
            <span>
              <i className="origin-swatch" />
              Origin country
            </span>
            <span>
              <i className="destination-swatch" />
              Destination countries
            </span>
          </div>
          {activeOrigin && (
            <Button size="small" variant="outlined" onClick={() => setOriginCountry(null)}>
              Show all journeys
            </Button>
          )}
        </div>
      )}
      {view === 'risk' && (
        <div className="footprint-risk-filters" aria-label="Filter destination risk">
          {(['all', ...riskOrder, 'higher'] as FootprintRisk[]).map((value) => {
            const count = riskSource.trips.filter(
              (trip) =>
                value === 'all' ||
                (value === 'higher' ? ['High', 'Severe'].includes(trip.risk) : trip.risk === value),
            ).length;
            return (
              <button
                key={value}
                aria-pressed={risk === value}
                onClick={() => setRisk(value)}
                disabled={!count && value !== 'all'}
              >
                {value === 'all' ? 'All risks' : value === 'higher' ? 'High + severe' : value}
                <strong>{n(count)}</strong>
              </button>
            );
          })}
          <span>Illustrative classifications</span>
        </div>
      )}
      {view === 'safety' && (
        <div className="footprint-safety-key">
          <span>
            <i style={{ background: '#486f83' }} />
            Check-ins only
          </span>
          <span>
            <i style={{ background: '#9a4e50' }} />
            Includes SOS records
          </span>
          <span>Numbers = check-ins + SOS records</span>
        </div>
      )}
      <div className="footprint-explorer-layout">
        <div className="footprint-visual">
          <div className="footprint-map-wrap">
            <div
              ref={container}
              className="footprint-map"
              role="region"
              aria-label="Interactive traveller footprint map"
            />
            <Button
              className="footprint-reset-map"
              size="small"
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={resetMap}
              title="Restore the map view and clear the country selection"
            >
              Reset map
            </Button>
            <div className="footprint-map-badge">
              <span className="footprint-context-dot" />
              {view === 'safety'
                ? 'Recorded safety activity'
                : activeOrigin
                  ? `Journeys from ${activeOrigin}`
                  : showLinks
                    ? 'Illustrative journey links'
                    : 'Recorded destinations'}
              <small>Mock data · not live tracking</small>
            </div>
          </div>
          <div className="footprint-time">
            <div className="footprint-time-heading">
              <div>
                <strong>Explore over time</strong>
                <span>
                  {interval
                    ? `${shortDate(interval.from)} — ${shortDate(interval.to)}`
                    : `${shortDate(range.from)} — ${shortDate(range.to)}`}
                </span>
              </div>
              <div>
                <Tooltip title={playing ? 'Pause timeline' : 'Play recorded intervals'}>
                  <IconButton
                    size="small"
                    aria-label={playing ? 'Pause timeline' : 'Play timeline'}
                    onClick={() => {
                      if (!playing && (windowIndex === null || windowIndex === windows.length - 1))
                        setWindowIndex(0);
                      setPlaying(!playing);
                    }}
                  >
                    {playing ? <PauseIcon /> : <PlayArrowIcon />}
                  </IconButton>
                </Tooltip>
                <Button
                  size="small"
                  variant={windowIndex === null ? 'contained' : 'outlined'}
                  onClick={() => chooseWindow(null)}
                >
                  Whole period
                </Button>
              </div>
            </div>
            <div className="footprint-time-bars" aria-label="Map time intervals">
              {windows.map((bucket, index) => (
                <Tooltip
                  key={bucket.from}
                  title={`${fmtDate(bucket.from)} — ${fmtDate(bucket.to)} · ${n(bucketCounts[index])} ${unit}`}
                >
                  <button
                    aria-label={`Map interval ${index + 1}: ${fmtDate(bucket.from)} to ${fmtDate(bucket.to)}`}
                    aria-pressed={windowIndex === index}
                    onClick={() => chooseWindow(index)}
                  >
                    <span className="footprint-time-count">{n(bucketCounts[index])}</span>
                    <i
                      style={{
                        height: `${Math.max(3, (32 * bucketCounts[index]) / Math.max(1, ...bucketCounts))}px`,
                      }}
                    />
                    <span>{shortDate(bucket.from)}</span>
                  </button>
                </Tooltip>
              ))}
            </div>
            <small>
              Scrub through recorded intervals or press play. Timeline and risk filters apply to
              this explorer only.
            </small>
          </div>
        </div>
        <aside className="footprint-explorer-rail" aria-label="Destination explorer">
          <div className="footprint-spotlight-heading">
            <span>DESTINATION SPOTLIGHT</span>
            <div>
              <IconButton
                size="small"
                aria-label={journeyMode ? 'Previous country' : 'Previous destination'}
                disabled={
                  journeyMode ? explorationPoints.length < 2 : !selected || visiblePoints.length < 2
                }
                onClick={() => stepDestination(-1)}
              >
                <NavigateBeforeIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label={journeyMode ? 'Next country' : 'Next destination'}
                disabled={
                  journeyMode ? explorationPoints.length < 2 : !selected || visiblePoints.length < 2
                }
                onClick={() => stepDestination(1)}
              >
                <NavigateNextIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
          {selected ? (
            <div className="footprint-spotlight" aria-live="polite">
              <h3>{selected.location}</h3>
              <span className="footprint-country">
                {selected.country}
                {selected.risk && view === 'risk' ? ` · ${selected.risk} illustrative risk` : ''}
              </span>
              <div className="footprint-spotlight-metrics">
                {(
                  [
                    { kind: 'trips', label: 'Trips', value: selected.trips.length },
                    {
                      kind: 'travellers',
                      label: 'Distinct travellers',
                      value: selected.travellers,
                    },
                    { kind: 'checkins', label: 'Check-ins', value: selected.checkins.length },
                    { kind: 'sos', label: 'SOS records', value: selected.sos.length },
                  ] as const
                ).map((metric) => (
                  <button
                    key={metric.kind}
                    disabled={metric.kind === 'travellers' || !metric.value}
                    aria-label={
                      metric.kind === 'travellers'
                        ? `${metric.value} distinct travellers at ${selected.location}`
                        : `View ${metric.label} at ${selected.location}`
                    }
                    onClick={() => {
                      if (metric.kind !== 'travellers') {
                        showReceipts(metric.kind);
                      }
                    }}
                  >
                    <strong>{n(metric.value)}</strong>
                    <span>
                      {metric.label}
                      {metric.kind !== 'travellers' && <ArrowForwardIcon />}
                    </span>
                  </button>
                ))}
              </div>
              {view === 'safety' ? (
                <p className="footprint-spotlight-note">
                  {selected.checkins.filter((record) => record.status === 'Completed').length}{' '}
                  completed ·{' '}
                  {selected.checkins.filter((record) => record.status === 'Missed').length} missed ·{' '}
                  {selected.checkins.filter((record) => record.status === 'Pending').length} pending
                  check-ins
                </p>
              ) : (
                <>
                  {selectedLinks.length > 0 && (
                    <div className="footprint-route-summary">
                      <FlightTakeoffIcon />
                      {selectedLinks.length === 1
                        ? selectedLinks[0].origin
                        : `${selectedLinks.length} origins`}
                      <ArrowForwardIcon />
                      {selected.location}
                      <strong>{n(selected.trips.length)}</strong>
                    </div>
                  )}
                  <div className="footprint-recent-journeys">
                    <span>RECENT JOURNEYS IN THIS WINDOW</span>
                    {recentTrips.map((trip) => (
                      <div key={trip.id}>
                        <strong>{trip.traveller}</strong>
                        <small>
                          {shortDate(trip.start)} — {shortDate(trip.end)} · {trip.provider}
                        </small>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <Button
                fullWidth
                size="small"
                variant="outlined"
                endIcon={<ArrowForwardIcon />}
                disabled={
                  view === 'safety'
                    ? !selected.checkins.length && !selected.sos.length
                    : !selected.trips.length
                }
                onClick={() => {
                  showReceipts(
                    view === 'safety' ? (selected.checkins.length ? 'checkins' : 'sos') : 'trips',
                  );
                }}
              >
                View supporting records
              </Button>
            </div>
          ) : (
            <div className="footprint-empty-spotlight" role="status">
              {activeOrigin ? (
                <>
                  <h3>{activeOrigin}</h3>
                  <strong>No departures recorded from {activeOrigin} in this period.</strong>
                  <p>
                    {arrivalCount
                      ? `${n(arrivalCount)} ${arrivalCount === 1 ? 'journey arrives' : 'journeys arrive'} here.`
                      : 'No arrivals recorded here in this period.'}{' '}
                    Select another country to explore its departures.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    No records match this interval. Choose another interval or restore the whole
                    period.
                  </p>
                  <Button
                    size="small"
                    onClick={() => {
                      chooseWindow(null);
                      setRisk('all');
                    }}
                  >
                    Show whole period
                  </Button>
                </>
              )}
            </div>
          )}
          <div className="footprint-ranking">
            <div className="footprint-ranking-title">
              <strong>Explore locations</strong>
              <span>{explorationPoints.length}</span>
            </div>
            <TextField
              size="small"
              fullWidth
              placeholder="Find a city or country"
              aria-label="Find map destination"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 16 }} />
                    </InputAdornment>
                  ),
                },
                htmlInput: { 'aria-label': 'Find map destination' },
              }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="footprint-ranking-list">
              {ranked.length ? (
                ranked.map((point) => (
                  <button
                    key={point.location}
                    aria-pressed={
                      journeyMode
                        ? activeOrigin === point.country
                        : selected?.location === point.location
                    }
                    aria-label={`Explore ${point.location}`}
                    onClick={() => focusPoint(point)}
                  >
                    <span className="footprint-ranking-index">
                      {explorationPoints.indexOf(point) + 1}
                    </span>
                    <span>
                      <strong>{point.location}</strong>
                      <small>{point.country}</small>
                    </span>
                    <span className="footprint-ranking-value">
                      {n(footprintCount(point, view))}
                      <small>{unit}</small>
                    </span>
                  </button>
                ))
              ) : (
                <p>No matching locations. Try a city or country.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
      <div className="footprint-footer">
        <Typography variant="caption" color="text.secondary">
          Fictional records · City-centre positions · Journey links are not flight paths.{' '}
          {journeyMode
            ? 'Click any country, bubble or location to highlight outgoing journeys without zooming. Bubble counts show destination trips before origin filtering.'
            : 'Click a highlighted country or destination to explore.'}
          {unmapped ? ` ${n(unmapped)} records have no mapped location.` : ''}
        </Typography>
        <Button size="small" onClick={onTravel} endIcon={<ArrowForwardIcon />}>
          Travel analytics
        </Button>
      </div>
    </Panel>
  );
}
