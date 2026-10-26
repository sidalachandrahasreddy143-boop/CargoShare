import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Container } from '../lib/types';
import { MODE_META } from './ui';

/**
 * Leaflet + OpenStreetMap — route visualization for the marketplace.
 * Draws great-circle-ish arcs between origins/destinations of visible listings.
 */
export default function MapView({
  containers, height = 360, interactive = true, onRouteClick, selectedId,
}: {
  containers: Container[];
  height?: number;
  interactive?: boolean;
  onRouteClick?: (originCode: string, destinationCode: string) => void;
  selectedId?: string;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // init map once
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      center: [22.6, 79.0], // India centroid
      zoom: 5,
      zoomControl: interactive,
      scrollWheelZoom: interactive,
      attributionControl: true,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 13,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [interactive]);

  // draw routes whenever listings change
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const drawnRoutes = new Set<string>();
    containers.forEach((c) => {
      const routeKey = `${c.originCode}-${c.destinationCode}`;
      const from = L.latLng(c.originLat, c.originLng);
      const to = L.latLng(c.destinationLat, c.destinationLng);
      const meta = MODE_META[c.mode];
      const isSelected = selectedId === c.id;

      // curved polyline via quadratic bezier midpoint offset
      const mid = L.latLng((from.lat + to.lat) / 2, (from.lng + to.lng) / 2);
      const dx = to.lng - from.lng, dy = to.lat - from.lat;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ctrl = L.latLng(mid.lat + (-dx / len) * len * 0.16, mid.lng + (dy / len) * len * 0.16);
      const points: L.LatLng[] = [];
      for (let t = 0; t <= 1; t += 0.06) {
        const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
        points.push(L.latLng(a * from.lat + b * ctrl.lat + d * to.lat, a * from.lng + b * ctrl.lng + d * to.lng));
      }

      const line = L.polyline(points, {
        color: meta.color,
        weight: isSelected ? 5 : 3,
        opacity: isSelected ? 0.95 : 0.62,
        dashArray: c.mode === 'air' ? '2 8' : c.mode === 'ship' ? '8 6' : undefined,
      });
      line.on('click', () => onRouteClick?.(c.originCode, c.destinationCode));
      line.bindTooltip(`${c.originCode} → ${c.destinationCode} · ${meta.label} · ${c.totalCapacity - c.bookedCapacity} ${c.unit} free`, { sticky: true, className: 'font-sans text-[11px]' });
      layer.addLayer(line);

      if (!drawnRoutes.has(`${c.originCode}`)) {
        const originIcon = L.divIcon({
          className: 'cs-marker',
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${meta.color};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
          iconSize: [12, 12], iconAnchor: [6, 6],
        });
        layer.addLayer(L.marker(from, { icon: originIcon }).bindPopup(`<b>${c.origin}</b><br/>Origin · ${meta.label} corridor`));
        drawnRoutes.add(`${c.originCode}`);
      }
      if (!drawnRoutes.has(`${c.destinationCode}-d`)) {
        const destIcon = L.divIcon({
          className: 'cs-marker',
          html: `<div style="width:10px;height:10px;border-radius:2px;background:#0E242D;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);transform:rotate(45deg)"></div>`,
          iconSize: [10, 10], iconAnchor: [5, 5],
        });
        layer.addLayer(L.marker(to, { icon: destIcon }).bindPopup(`<b>${c.destination}</b><br/>Destination`));
        drawnRoutes.add(`${c.destinationCode}-d`);
      }
    });
  }, [containers, selectedId, onRouteClick]);

  return (
    <div
      ref={elRef}
      style={{ height }}
      className="z-0 w-full overflow-hidden rounded-2xl border border-ink/15 shadow-lg"
      role="application"
      aria-label="Interactive map of CargoShare corridors"
    />
  );
}
