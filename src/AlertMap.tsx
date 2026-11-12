import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  ButtonBase,
  TextField,
  MenuItem,
  Typography,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import FitScreenOutlinedIcon from '@mui/icons-material/FitScreenOutlined';
import L from 'leaflet';
import type { GeoJsonObject } from 'geojson';
import 'leaflet/dist/leaflet.css';
import world from './assets/world-countries.json';
import type { nearbyAlertEvidence } from './evidenceModel';
import AlertDensityLayer from './AlertDensityLayer';
import {
  alertRiskColours,
  highestAlertRisk,
  clusterAlertLocations,
  partitionAlertLocations,
  type AlertLocation,
} from './alertMapModel';

function fitAlertLocations(instance: L.Map, locations: AlertLocation[], maxZoom = 5) {
  if (!locations.length) {
    instance.setView([20, 15], 1, { animate: false });
    return;
  }
  const size = instance.getSize(),
    padding = Math.min(65, size.x * 0.08, size.y * 0.12);
  instance.fitBounds(
    locations.map((location) => [location.lat, location.lng] as L.LatLngTuple),
    { padding: [padding, padding], maxZoom, animate: false },
  );
}

export default function AlertMap({
  evidence,
  onRecords,
}: {
  evidence: ReturnType<typeof nearbyAlertEvidence>;
  onRecords: (rows: ReturnType<typeof nearbyAlertEvidence>) => void;
}) {
  const [risk, setRisk] = useState('All');
  const [category, setCategory] = useState('All');
  const [showCounts, setShowCounts] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const filtered = useMemo(
    () =>
      evidence.filter(
        (a) => (risk === 'All' || a.risk === risk) && (category === 'All' || a.type === category),
      ),
    [evidence, risk, category],
  );
  const { locations, unmapped } = useMemo(() => partitionAlertLocations(filtered), [filtered]);
  const mapped = locations.reduce((sum, location) => sum + location.rows.length, 0);
  const total = mapped + unmapped.length;
  const records = useRef(onRecords);
  useEffect(() => {
    records.current = onRecords;
  }, [onRecords]);
  const fit = () => {
    const instance = map.current;
    if (!instance) return;
    fitAlertLocations(instance, locations);
  };
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      center: [20, 15],
      zoom: 1,
      minZoom: 0,
      maxZoom: 12,
      scrollWheelZoom: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });
    map.current = instance;
    L.geoJSON(world as GeoJsonObject, {
      style: { color: '#bbc9cb', weight: 0.8, fillColor: '#f7f5ef', fillOpacity: 1 },
      attribution: 'Natural Earth · Public domain',
    }).addTo(instance);
    const observer = new ResizeObserver(() => instance.invalidateSize({ animate: false }));
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const density = new AlertDensityLayer(locations).addTo(instance);
    fitAlertLocations(instance, locations);
    return () => {
      density.remove();
    };
  }, [locations]);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const group = L.layerGroup().addTo(instance);
    const drawMarkers = () => {
      group.clearLayers();
      if (!showCounts) return;
      const clusters = clusterAlertLocations(
        locations,
        (location) => instance.latLngToContainerPoint([location.lat, location.lng]),
        instance.getZoom(),
      );
      for (const cluster of clusters) {
        const multiple = cluster.locations.length > 1;
        const names = cluster.locations.map((location) => location.name).join(', ');
        const highestRisk = highestAlertRisk(cluster.rows);
        const title = multiple
          ? `${cluster.rows.length} alerts · Highest risk: ${highestRisk} · ${names}. Select to zoom in.`
          : `${cluster.rows.length} ${cluster.rows.length === 1 ? 'alert' : 'alerts'} near ${names} · Highest risk: ${highestRisk}. Select to view records.`;
        const size = 44;
        const marker = L.marker([cluster.lat, cluster.lng], {
          icon: L.divIcon({
            className: `alert-map-marker${multiple ? ' alert-map-cluster' : ''}`,
            html: `<span>${cluster.rows.length}</span><small>${cluster.rows.length === 1 ? 'alert' : 'alerts'}</small>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          }),
          title,
          alt: title,
          keyboard: true,
        }).addTo(group);
        const tooltip = document.createElement('span');
        tooltip.textContent = title;
        marker.bindTooltip(tooltip);
        marker.on('click', () => {
          if (multiple)
            fitAlertLocations(instance, cluster.locations, Math.min(12, instance.getZoom() + 3));
          else records.current(cluster.rows);
        });
      }
    };
    drawMarkers();
    // Panning translates the geographic layers directly; clustering only changes with scale.
    instance.on('zoomend', drawMarkers);
    return () => {
      instance.off('zoomend', drawMarkers);
      group.remove();
    };
  }, [locations, showCounts]);
  return (
    <div className="alert-map-content">
      <div className="alert-map-filters">
        <TextField
          select
          size="small"
          label="Alert risk"
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
        >
          {['All', 'Low', 'Moderate', 'High', 'Severe'].map((v) => (
            <MenuItem key={v} value={v}>
              {v === 'All' ? 'All risks' : v}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Alert category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {['All', ...new Set(evidence.map((a) => a.type))].map((v) => (
            <MenuItem key={v} value={v}>
              {v === 'All' ? 'All categories' : v}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          className="alert-count-toggle"
          control={
            <Checkbox
              size="small"
              checked={showCounts}
              onChange={(_, checked) => setShowCounts(checked)}
            />
          }
          label="Show alert counts on map"
        />
        {(risk !== 'All' || category !== 'All') && (
          <Button
            onClick={() => {
              setRisk('All');
              setCategory('All');
            }}
          >
            Clear map filters
          </Button>
        )}
      </div>
      <div className="alert-map-summary" aria-live="polite">
        <Typography variant="body2">
          <strong>{total}</strong> distinct alerts near customer assets
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {mapped} mapped · {locations.length} locations · {unmapped.length} unmapped
        </Typography>
      </div>
      <div className="alert-map-layout">
        <div className="alert-map-stage">
          <div
            ref={container}
            className="alert-map"
            role="region"
            aria-label="Alerts near customer assets map"
          />
          <Button
            className="alert-map-fit"
            size="small"
            variant="outlined"
            startIcon={<FitScreenOutlinedIcon />}
            onClick={fit}
            title="Fit the mapped alerts without changing filters"
          >
            Reset alert map
          </Button>
        </div>
        <aside className="alert-location-list" aria-label="Nearby alerts by location">
          <Typography component="h3" variant="subtitle2">
            Nearby alerts by location
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Select a location to view its alerts and recorded risk.
          </Typography>
          <div className="alert-location-ranking">
            {locations.map((location) => (
              <ButtonBase
                className="alert-location-row"
                key={location.key}
                onClick={() => onRecords(location.rows)}
                aria-label={`View ${location.rows.length} ${location.rows.length === 1 ? 'alert' : 'alerts'} near ${location.name}`}
              >
                <span className="alert-location-name">
                  {location.name}
                  <small className="alert-location-risk">
                    <i style={{ background: alertRiskColours[highestAlertRisk(location.rows)] }} />
                    {highestAlertRisk(location.rows)} risk
                  </small>
                </span>
                <span className="alert-location-count">
                  <strong>{location.rows.length}</strong>
                  <small>{location.rows.length === 1 ? 'alert' : 'alerts'}</small>
                </span>
              </ButtonBase>
            ))}
            {!locations.length && (
              <Typography variant="body2" color="text.secondary">
                No mapped locations for these filters.
              </Typography>
            )}
          </div>
          {unmapped.length > 0 && (
            <Button size="small" className="alert-unmapped" onClick={() => onRecords(unmapped)}>
              View {unmapped.length} unmapped alerts
            </Button>
          )}
        </aside>
      </div>
      {mapped === 0 && (
        <Alert severity="info">
          {total === 0
            ? 'No alerts match these map filters.'
            : 'No mapped alerts for these filters. Alerts without usable coordinates remain in supporting records.'}
        </Alert>
      )}
      <div className="alert-map-key">
        <strong>Nearby alert concentration</strong>
        <span>Lower</span>
        <i className="alert-heat-scale" aria-hidden="true" />
        <span>Higher</span>
        <span className="alert-map-key-note">
          Overlapping alerts build hotter areas. Scale is relative to this selection; recorded risk
          is available in the filter and records.
        </span>
      </div>
      <Typography variant="caption">
        Nearby-asset snapshots only. Proximity does not establish notification delivery or harm.
        Public city centres, not asset or traveller positions.
      </Typography>
      <Button
        className="alert-map-records"
        variant="outlined"
        onClick={() => onRecords(filtered)}
        disabled={!filtered.length}
      >
        View supporting alert records
      </Button>
    </div>
  );
}
