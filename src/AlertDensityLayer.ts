import L from 'leaflet';
import type { AlertLocation } from './alertMapModel';
import { densityField, heatPalette, heatRadius, heatReference } from './heatModel';

/** Geographic canvas: the map pane translates immediately during drag and inertia. */
export default class AlertDensityLayer extends L.Layer {
  private view?: L.Map;
  private canvas?: HTMLCanvasElement;
  private frame?: number;
  private surface?: HTMLCanvasElement;
  constructor(private locations: AlertLocation[]) {
    super();
  }
  onAdd(map: L.Map): this {
    this.view = map;
    const pane = map.getPane('alertDensityPane') || map.createPane('alertDensityPane');
    pane.style.zIndex = '450';
    pane.style.pointerEvents = 'none';
    this.canvas = L.DomUtil.create('canvas', 'alert-density', pane);
    this.canvas.setAttribute('aria-hidden', 'true');
    this.surface = document.createElement('canvas');
    this.draw();
    return this;
  }
  onRemove(): this {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.canvas?.remove();
    this.canvas = undefined;
    this.surface = undefined;
    this.view = undefined;
    return this;
  }
  getEvents() {
    return {
      move: this.queueDraw,
      moveend: this.draw,
      zoomend: this.draw,
      resize: this.draw,
      viewreset: this.draw,
    };
  }
  private queueDraw = () => {
    if (this.frame === undefined) this.frame = requestAnimationFrame(this.draw);
  };
  private draw = () => {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    const map = this.view,
      canvas = this.canvas;
    if (!map || !canvas) return;
    // Padding avoids clipped halos and bare strips while Leaflet translates the pane.
    const padding = heatRadius + 8,
      size = map.getSize(),
      width = size.x + padding * 2,
      height = size.y + padding * 2;
    const origin = map.containerPointToLayerPoint([-padding, -padding]);
    L.DomUtil.setPosition(canvas, origin);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.ceil(width * ratio),
      pixelHeight = Math.ceil(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const points = this.locations.map((location) => {
      const point = map.latLngToLayerPoint([location.lat, location.lng]).subtract(origin);
      return { x: point.x, y: point.y, weight: location.rows.length };
    });
    const reference = heatReference(points, heatRadius);
    const field = densityField(points, width, height, heatRadius);
    const surface = this.surface;
    if (!surface) return;
    if (surface.width !== field.columns || surface.height !== field.rows) {
      surface.width = field.columns;
      surface.height = field.rows;
    }
    const surfaceContext = surface.getContext('2d');
    if (!surfaceContext) return;
    const pixels = surfaceContext.createImageData(field.columns, field.rows);
    for (let index = 0; index < field.values.length; index++) {
      const value = field.values[index];
      if (value <= 0) continue;
      const colour = Math.min(255, Math.round((value / reference) * 255)) * 4;
      const offset = index * 4;
      pixels.data[offset] = heatPalette[colour];
      pixels.data[offset + 1] = heatPalette[colour + 1];
      pixels.data[offset + 2] = heatPalette[colour + 2];
      pixels.data[offset + 3] = heatPalette[colour + 3];
    }
    surfaceContext.putImageData(pixels, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(surface, 0, 0, field.columns * field.step, field.rows * field.step);
  };
}
