import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJsonObject } from 'geojson';
import world from './assets/world-countries.json';
export type MapItem = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  radiusMeters?: number | null;
  boundary?: Array<[number, number]>;
  detail?: string;
};
export default function EvidenceMap({
  items,
  readOnly = false,
}: {
  items: MapItem[];
  readOnly?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, {
      center: [20, 15],
      zoom: 1,
      minZoom: 1,
      maxZoom: 12,
      zoomControl: !readOnly,
      attributionControl: true,
      scrollWheelZoom: false,
      dragging: !readOnly,
      doubleClickZoom: !readOnly,
      keyboard: !readOnly,
      touchZoom: !readOnly,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });
    L.geoJSON(world as GeoJsonObject, {
      style: { color: '#bac7cc', weight: 0.7, fillColor: '#f5f3ed', fillOpacity: 1 },
      attribution: 'Natural Earth · Public domain',
    }).addTo(map);
    const points: Array<[number, number]> = [];
    for (const item of items) {
      if (item.lat === null || item.lng === null) continue;
      points.push([item.lat, item.lng]);
      if (item.boundary?.length) points.push(...item.boundary);
      if (item.radiusMeters) {
        const delta = item.radiusMeters / 111000;
        points.push([item.lat - delta, item.lng - delta], [item.lat + delta, item.lng + delta]);
      }
      if (item.boundary?.length)
        L.polygon(item.boundary, {
          color: '#007dbb',
          weight: 2,
          fillOpacity: 0.12,
          interactive: !readOnly,
        }).addTo(map);
      if (item.radiusMeters)
        L.circle([item.lat, item.lng], {
          radius: item.radiusMeters,
          color: '#007dbb',
          weight: 2,
          fillOpacity: 0.12,
          interactive: !readOnly,
        }).addTo(map);
      const marker = L.circleMarker([item.lat, item.lng], {
        radius: 7,
        color: '#007dbb',
        weight: 2,
        fillColor: '#fff',
        fillOpacity: 1,
        interactive: !readOnly,
      }).addTo(map);
      const text = document.createElement('span');
      text.textContent = `${item.name}${item.detail ? ` · ${item.detail}` : ''}`;
      if (!readOnly) marker.bindTooltip(text, { permanent: items.length === 1, direction: 'top' });
    }
    if (points.length)
      map.fitBounds(points, {
        padding: [40, 40],
        maxZoom:
          items.length === 1 && (items[0].radiusMeters || items[0].boundary?.length) ? 12 : 4,
        animate: false,
      });
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [items, readOnly]);
  return (
    <div
      ref={container}
      className="evidence-map"
      role="img"
      aria-label="Recorded locations on bundled world map"
    />
  );
}
