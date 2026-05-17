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
/** Inject an alternative country-boundary source for interior border rendering. */
export type CountryBoundarySource = () => [number, number][][];

/**
 * Generate canvas-based earth textures with the Oblivion UI aesthetic.
 * Pass a custom `source` to swap the underlying coastline data (e.g. GeoJSON pipeline).
 */
export function createEarthTextures(
  source: CoastlineSource = () => COASTLINES,
  boundarySource: CountryBoundarySource = () => []
): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  // Main texture at 4096×2048 for sufficient coastline detail at default zoom.
  // Height/normal maps at half resolution — 2048×1024 reduces pixel loop cost
  // by 4× while still providing adequate terrain shading.
  const width = 4096;
  const height = 2048;
  const hmWidth = 2048;
  const hmHeight = 1024;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Projection functions bound to main canvas dimensions
  const toX = (lon: number) => projToX(lon, width);
  const toY = (lat: number) => projToY(lat, height);

  // Separate projection for height map canvas (lower resolution)
  const hmToX = (lon: number) => projToX(lon, hmWidth);
  const hmToY = (lat: number) => projToY(lat, hmHeight);

  const coastlines = source();
  const countryBoundaries = boundarySource();
  const heightCanvas = generateHeightCanvas(hmWidth, hmHeight, coastlines, hmToX, hmToY);

  drawBaseLayer(ctx, width, height);
  drawGridLines(ctx, width, height, toX, toY);
  drawContinentFills(ctx, coastlines, toX, toY);
  drawContourLines(ctx, coastlines, toX, toY);
  drawCoastlines(ctx, coastlines, toX, toY);
  drawInteriorBorders(ctx, countryBoundaries, toX, toY);

  // Composite height shading (multiply blend)
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.7;
  ctx.drawImage(heightCanvas, 0, 0, width, height);
  ctx.restore();

  const normalCanvas = generateNormalMap(heightCanvas, hmWidth, hmHeight);

  const mapTexture = new THREE.CanvasTexture(canvas);
  mapTexture.wrapS = THREE.RepeatWrapping;
  mapTexture.wrapT = THREE.ClampToEdgeWrapping;

  const normalTexture = new THREE.CanvasTexture(normalCanvas);
  normalTexture.wrapS = THREE.RepeatWrapping;
  normalTexture.wrapT = THREE.ClampToEdgeWrapping;

  return { map: mapTexture, normalMap: normalTexture };
}
