import * as THREE from 'three';
import { COASTLINES } from './coastlineData';
import { toX as projToX, toY as projToY } from './projection';
import { generateHeightCanvas, generateNormalMap } from './normalMap';

/** Inject an alternative coastline source to swap built-in data for GeoJSON without touching render logic. */
export type CoastlineSource = () => [number, number][][];

const OBLIVION_COLORS = {
  background: '#0A0A0F',
  gridDot: 'rgba(200, 230, 240, 0.03)',
  gridLine: 'rgba(0, 212, 255, 0.06)',
  gridMajor: 'rgba(0, 212, 255, 0.12)',
  coastline: 'rgba(0, 212, 255, 0.85)',
  coastlineGlow: 'rgba(0, 212, 255, 0.45)',
  landFill: 'rgba(0, 212, 255, 0.14)',
  contourLine: 'rgba(0, 212, 255, 0.28)',
};

/**
 * Generate canvas-based earth textures with the Oblivion UI aesthetic.
 * Pass a custom `source` to swap the underlying coastline data (e.g. GeoJSON pipeline).
 */
export function createEarthTextures(source: CoastlineSource = () => COASTLINES): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const width = 2048;
  const height = 1024;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Bind projection functions for this canvas size
  const toX = (lon: number) => projToX(lon, width);
  const toY = (lat: number) => projToY(lat, height);

  const coastlines = source();
  const heightCanvas = generateHeightCanvas(width, height, coastlines, toX, toY);

  // Background
  ctx.fillStyle = OBLIVION_COLORS.background;
  ctx.fillRect(0, 0, width, height);

  // Dot grid (Oblivion signature pattern)
  ctx.fillStyle = OBLIVION_COLORS.gridDot;
  const dotSpacing = 20;
  for (let x = 0; x < width; x += dotSpacing) {
    for (let y = 0; y < height; y += dotSpacing) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Thin grid lines every 15 degrees
  ctx.strokeStyle = OBLIVION_COLORS.gridLine;
  ctx.lineWidth = 0.5;
  for (let lat = -75; lat <= 75; lat += 15) {
    ctx.beginPath();
    ctx.moveTo(0, toY(lat));
    ctx.lineTo(width, toY(lat));
    ctx.stroke();
  }
  for (let lon = -165; lon <= 180; lon += 15) {
    ctx.beginPath();
    ctx.moveTo(toX(lon), 0);
    ctx.lineTo(toX(lon), height);
    ctx.stroke();
  }

  // Major grid lines every 30 degrees (dashed, brighter)
  ctx.strokeStyle = OBLIVION_COLORS.gridMajor;
  ctx.lineWidth = 1;
  for (let lat = -60; lat <= 60; lat += 30) {
    ctx.beginPath();
    ctx.setLineDash([8, 4]);
    ctx.moveTo(0, toY(lat));
    ctx.lineTo(width, toY(lat));
    ctx.stroke();
  }
  for (let lon = -150; lon <= 180; lon += 30) {
    ctx.beginPath();
    ctx.moveTo(toX(lon), 0);
    ctx.lineTo(toX(lon), height);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Equator and prime meridian accents
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, toY(0));
  ctx.lineTo(width, toY(0));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(toX(0), 0);
  ctx.lineTo(toX(0), height);
  ctx.stroke();

  // Continent fills (closed polygons only)
  ctx.fillStyle = OBLIVION_COLORS.landFill;
  for (const coastline of coastlines) {
    if (coastline.length < 4) continue;
    const first = coastline[0];
    const last = coastline[coastline.length - 1];
    if (Math.abs(first[0] - last[0]) >= 5 || Math.abs(first[1] - last[1]) >= 5) continue;
    ctx.beginPath();
    ctx.moveTo(toX(coastline[0][0]), toY(coastline[0][1]));
    for (let i = 1; i < coastline.length; i++)
      ctx.lineTo(toX(coastline[i][0]), toY(coastline[i][1]));
    ctx.closePath();
    ctx.fill();
  }

  // Contour lines (closed polygons, single pass)
  ctx.strokeStyle = OBLIVION_COLORS.contourLine;
  ctx.lineWidth = 1;
  for (const coastline of coastlines) {
    if (coastline.length < 4) continue;
    const first = coastline[0];
    const last = coastline[coastline.length - 1];
    if (Math.abs(first[0] - last[0]) >= 5 || Math.abs(first[1] - last[1]) >= 5) continue;
    ctx.beginPath();
    ctx.moveTo(toX(coastline[0][0]), toY(coastline[0][1]));
    for (let i = 1; i < coastline.length; i++) {
      if (Math.abs(coastline[i][0] - coastline[i - 1][0]) > 180) {
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(toX(coastline[i][0]), toY(coastline[i][1]));
      } else {
        ctx.lineTo(toX(coastline[i][0]), toY(coastline[i][1]));
      }
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Coastline glow (outer, all polylines)
  ctx.strokeStyle = OBLIVION_COLORS.coastlineGlow;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const coastline of coastlines) {
    ctx.beginPath();
    ctx.moveTo(toX(coastline[0][0]), toY(coastline[0][1]));
    for (let i = 1; i < coastline.length; i++) {
      if (Math.abs(coastline[i][0] - coastline[i - 1][0]) > 180) {
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(toX(coastline[i][0]), toY(coastline[i][1]));
      } else {
        ctx.lineTo(toX(coastline[i][0]), toY(coastline[i][1]));
      }
    }
    ctx.stroke();
  }

  // Coastline crisp inner line
  ctx.strokeStyle = OBLIVION_COLORS.coastline;
  ctx.lineWidth = 1.5;
  for (const coastline of coastlines) {
    ctx.beginPath();
    ctx.moveTo(toX(coastline[0][0]), toY(coastline[0][1]));
    for (let i = 1; i < coastline.length; i++) {
      if (Math.abs(coastline[i][0] - coastline[i - 1][0]) > 180) {
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(toX(coastline[i][0]), toY(coastline[i][1]));
      } else {
        ctx.lineTo(toX(coastline[i][0]), toY(coastline[i][1]));
      }
    }
    ctx.stroke();
  }

  // Faint dashed interior offset (suggests country boundaries)
  ctx.strokeStyle = 'rgba(200,230,240,0.14)';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([6, 4]);
  for (const coastline of coastlines) {
    if (coastline.length < 4) continue;
    let cx = 0,
      cy = 0;
    for (const p of coastline) {
      cx += p[0];
      cy += p[1];
    }
    cx /= coastline.length;
    cy /= coastline.length;
    ctx.beginPath();
    const startX = cx + (coastline[0][0] - cx) * 0.98;
    const startY = cy + (coastline[0][1] - cy) * 0.98;
    ctx.moveTo(toX(startX), toY(startY));
    for (let i = 1; i < coastline.length; i++) {
      ctx.lineTo(toX(cx + (coastline[i][0] - cx) * 0.98), toY(cy + (coastline[i][1] - cy) * 0.98));
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Composite height shading (multiply blend)
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.7;
  ctx.drawImage(heightCanvas, 0, 0, width, height);
  ctx.restore();

  const normalCanvas = generateNormalMap(heightCanvas, width, height);

  const mapTexture = new THREE.CanvasTexture(canvas);
  mapTexture.wrapS = THREE.RepeatWrapping;
  mapTexture.wrapT = THREE.ClampToEdgeWrapping;

  const normalTexture = new THREE.CanvasTexture(normalCanvas);
  normalTexture.wrapS = THREE.RepeatWrapping;
  normalTexture.wrapT = THREE.ClampToEdgeWrapping;

  return { map: mapTexture, normalMap: normalTexture };
}
