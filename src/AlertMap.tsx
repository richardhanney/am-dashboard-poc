import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, TextField, MenuItem, Typography } from '@mui/material';
import L from 'leaflet';
import type { GeoJsonObject } from 'geojson';
import 'leaflet/dist/leaflet.css';
import world from './assets/world-countries.json';
import { buildFootprint } from './footprint';
import { type Selected } from './data';
import { alertRows } from './components';

export default function AlertMap({
  data,
  onRecords,
}: {
  data: Selected;
  onRecords: (
    rows: Array<
      ReturnType<typeof alertRows>[number] & {
        coordinates?: { lat: number; lng: number };
        assets: number;
      }
    >,
  ) => void;
}) {
  const [risk, setRisk] = useState('All');
  const [category, setCategory] = useState('All');
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const places = useMemo(() => buildFootprint(data).points, [data]);
  const all = useMemo(
    () =>
      alertRows(data).map((row, index) => ({
        ...row,
        coordinates: index % 7 === 0 ? undefined : places.find((p) => p.location === row.location),
        assets: 1 + (index % 3),
      })),
    [data, places],
  );
  const filtered = all.filter(
    (a) => (risk === 'All' || a.risk === risk) && (category === 'All' || a.type === category),
  );
  const selection = useRef({ rows: filtered, onRecords });
  useEffect(() => {
    selection.current = { rows: filtered, onRecords };
  }, [filtered, onRecords]);
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      center: [20, 15],
      zoom: 1,
      minZoom: 1,
      maxZoom: 12,
      scrollWheelZoom: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });
    map.current = instance;
    L.geoJSON(world as GeoJsonObject, {
      style: { color: '#bac7cc', weight: 0.7, fillColor: '#f5f3ed', fillOpacity: 1 },
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
    const group = L.layerGroup().addTo(instance);
    const locations = new Map<string, typeof filtered>();
    for (const row of filtered)
      if (row.coordinates)
        locations.set(row.location, [...(locations.get(row.location) || []), row]);
    const canvas = document.createElement('canvas');
    canvas.className = 'alert-density';
    canvas.setAttribute('aria-hidden', 'true');
    instance.getContainer().appendChild(canvas);
    const draw = () => {
      group.clearLayers();
      const size = instance.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const max = Math.max(1, ...[...locations.values()].map((rows) => rows.length));
        for (const rows of locations.values()) {
          const p = rows[0].coordinates!;
          const point = instance.latLngToContainerPoint([p.lat, p.lng]);
          const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 40);
          const weight = rows.length / max;
          gradient.addColorStop(0, `rgba(239,59,32,${0.3 + weight * 0.4})`);
          gradient.addColorStop(0.35, `rgba(255,160,0,${0.25 + weight * 0.25})`);
          gradient.addColorStop(0.65, 'rgba(98,178,138,0.3)');
          gradient.addColorStop(1, 'rgba(0,106,220,0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(point.x - 40, point.y - 40, 80, 80);
        }
      }
      const clusters: Array<Array<(typeof filtered)[number]>> = [];
      for (const rows of locations.values()) {
        const p = rows[0].coordinates!;
        const at = instance.latLngToContainerPoint([p.lat, p.lng]);
        const cluster =
          instance.getZoom() < 9
            ? clusters.find((items) => {
                const point = items[0].coordinates!;
                return at.distanceTo(instance.latLngToContainerPoint([point.lat, point.lng])) < 35;
              })
            : undefined;
        if (cluster) cluster.push(...rows);
        else clusters.push([...rows]);
      }
      for (const rows of clusters) {
        const locationsInGroup = [...new Set(rows.map((row) => row.location))];
        const lat = rows.reduce((v, r) => v + r.coordinates!.lat, 0) / rows.length;
        const lng = rows.reduce((v, r) => v + r.coordinates!.lng, 0) / rows.length;
        const title =
          locationsInGroup.length > 1
            ? `Zoom to ${locationsInGroup.length} alert locations, ${rows.length} alerts`
            : `View ${rows.length} fictional alerts near ${locationsInGroup[0]}`;
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'alert-map-marker',
            html: `<span>${rows.length}</span>`,
            iconSize: [32, 32],
          }),
          title,
          alt: title,
          keyboard: true,
        }).addTo(group);
        marker.bindTooltip(title);
        marker.on('click', () => {
          if (locationsInGroup.length > 1)
            instance.fitBounds(
              rows.map((r) => [r.coordinates!.lat, r.coordinates!.lng] as L.LatLngTuple),
              { padding: [50, 50], maxZoom: Math.min(12, instance.getZoom() + 3), animate: false },
            );
          else
            selection.current.onRecords(
              selection.current.rows.filter((r) => r.location === locationsInGroup[0]),
            );
        });
      }
    };
    draw();
    instance.on('moveend zoomend resize', draw);
    return () => {
      instance.off('moveend zoomend resize', draw);
      group.remove();
      canvas.remove();
    };
  }, [filtered]);
  const unmapped = filtered.filter((r) => !r.coordinates).length;
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
          {['All', ...new Set(all.map((a) => a.type))].map((v) => (
            <MenuItem key={v} value={v}>
              {v === 'All' ? 'All categories' : v}
            </MenuItem>
          ))}
        </TextField>
        <Button
          onClick={() => {
            setRisk('All');
            setCategory('All');
            map.current?.setView([20, 15], 1, { animate: false });
          }}
        >
          Reset alert map
        </Button>
      </div>
      <Typography>
        {filtered.length} distinct alerts · {unmapped} without usable coordinates
      </Typography>
      <div
        ref={container}
        className="alert-map"
        role="region"
        aria-label="Alerts near customer assets map"
      />
      {filtered.length === unmapped && (
        <Alert severity="info">
          No mapped alerts for these filters. Unmapped alerts remain available in supporting
          records.
        </Alert>
      )}
      <div className="alert-map-key">
        <span>Lower density</span>
        <i />
        <span>Higher density · distinct alerts · relative to this view</span>
      </div>
      <Typography variant="caption">
        Fabricated nearby-asset snapshots only. Proximity does not establish notification delivery
        or harm. Public city centres, not asset or traveller positions.
      </Typography>
      <Button className="alert-map-records" variant="outlined" onClick={() => onRecords(filtered)}>
        View supporting alert records
      </Button>
    </div>
  );
}
