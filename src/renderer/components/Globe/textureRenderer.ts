import * as THREE from 'three';
import { COASTLINES } from './coastlineData';
import { toX as projToX, toY as projToY } from './projection';
import { generateHeightCanvas, generateNormalMap } from './normalMap';
import {
  drawBaseLayer,
  drawGridLines,
  drawContinentFills,
  drawContourLines,
  drawCoastlines,
  drawInteriorBorders,
} from './drawLayers';

/** Inject an alternative coastline source to swap built-in data for GeoJSON without touching render logic. */
export type CoastlineSource = () => [number, number][][];

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

  drawBaseLayer(ctx, width, height);
  drawGridLines(ctx, width, height, toX, toY);
  drawContinentFills(ctx, coastlines, toX, toY);
  drawContourLines(ctx, coastlines, toX, toY);
  drawCoastlines(ctx, coastlines, toX, toY);
  drawInteriorBorders(ctx, coastlines, toX, toY);

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
