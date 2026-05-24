import type { ProjectionFn } from './projection';
import type { CoastlinePolyline } from './coastlineData';
import type { CountryBoundaryLine } from './textureRenderer';

const OBLIVION_COLORS = {
  background: '#0A0A0F',
  oceanDeep: '#071019',
  oceanMid: '#0b1822',
  oceanShelf: 'rgba(18, 72, 86, 0.24)',
  gridDot: 'rgba(200, 230, 240, 0.03)',
  gridLine: 'rgba(0, 212, 255, 0.06)',
  gridMajor: 'rgba(0, 212, 255, 0.12)',
  coastline: 'rgba(0, 212, 255, 0.85)',
  coastlineGlow: 'rgba(0, 212, 255, 0.45)',
  landFillLow: '#0d2430',
  landFillHigh: '#173643',
  contourLine: 'rgba(0, 212, 255, 0.28)',
};

/** Stroke one polyline, breaking the path at antimeridian longitude jumps (> 180 deg). */
function strokeWrappedPath(
  ctx: CanvasRenderingContext2D,
  coastline: CoastlinePolyline,
  toX: ProjectionFn,
  toY: ProjectionFn,
  close: boolean
): void {
  if (coastline.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(toX(coastline[0][0]), toY(coastline[0][1]));
  for (let i = 1; i < coastline.length; i++) {
    if (Math.abs(coastline[i][0] - coastline[i - 1][0]) > 180) {
      if (close) ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(toX(coastline[i][0]), toY(coastline[i][1]));
    } else {
      ctx.lineTo(toX(coastline[i][0]), toY(coastline[i][1]));
    }
  }
  if (close) ctx.closePath();
  ctx.stroke();
}

/** Draw background fill and Oblivion dot grid. */
export function drawBaseLayer(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, OBLIVION_COLORS.oceanDeep);
  gradient.addColorStop(0.5, OBLIVION_COLORS.oceanMid);
  gradient.addColorStop(1, OBLIVION_COLORS.background);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = OBLIVION_COLORS.gridDot;
  const dotSpacing = 20;
  for (let x = 0; x < width; x += dotSpacing) {
    for (let y = 0; y < height; y += dotSpacing) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Draw ocean depth cues with broad shelf strokes around coastlines. */
export function drawOceanDepthShading(
  ctx: CanvasRenderingContext2D,
  coastlines: CoastlinePolyline[],
  toX: ProjectionFn,
  toY: ProjectionFn
): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = 'rgba(11, 40, 52, 0.16)';
  ctx.lineWidth = 34;
  for (const coastline of coastlines) {
    strokeWrappedPath(ctx, coastline, toX, toY, false);
  }

  ctx.strokeStyle = OBLIVION_COLORS.oceanShelf;
  ctx.lineWidth = 18;
  for (const coastline of coastlines) {
    strokeWrappedPath(ctx, coastline, toX, toY, false);
  }
}

/** Draw latitude/longitude grid lines and equator/prime meridian accents. */
export function drawGridLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  toX: ProjectionFn,
  toY: ProjectionFn
): void {
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
}

/** Draw filled continent polygons (closed polylines only). */
export function drawContinentFills(
  ctx: CanvasRenderingContext2D,
  coastlines: CoastlinePolyline[],
  toX: ProjectionFn,
  toY: ProjectionFn
): void {
  for (const coastline of coastlines) {
    if (coastline.length < 4) continue;
    const first = coastline[0];
    const last = coastline[coastline.length - 1];
    if (Math.abs(first[0] - last[0]) >= 5 || Math.abs(first[1] - last[1]) >= 5) continue;

    const latitudes = coastline.map(([, lat]) => lat);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const fillGradient = ctx.createLinearGradient(0, toY(maxLat), 0, toY(minLat));
    fillGradient.addColorStop(0, OBLIVION_COLORS.landFillHigh);
    fillGradient.addColorStop(1, OBLIVION_COLORS.landFillLow);

    ctx.fillStyle = fillGradient;
    ctx.beginPath();
    ctx.moveTo(toX(coastline[0][0]), toY(coastline[0][1]));
    for (let i = 1; i < coastline.length; i++)
      ctx.lineTo(toX(coastline[i][0]), toY(coastline[i][1]));
    ctx.closePath();
    ctx.fill();
  }
}

/** Draw faint contour lines on closed polygons. */
export function drawContourLines(
  ctx: CanvasRenderingContext2D,
  coastlines: CoastlinePolyline[],
  toX: ProjectionFn,
  toY: ProjectionFn
): void {
  ctx.strokeStyle = OBLIVION_COLORS.contourLine;
  ctx.lineWidth = 1;
  for (const coastline of coastlines) {
    if (coastline.length < 4) continue;
    const first = coastline[0];
    const last = coastline[coastline.length - 1];
    if (Math.abs(first[0] - last[0]) >= 5 || Math.abs(first[1] - last[1]) >= 5) continue;
    strokeWrappedPath(ctx, coastline, toX, toY, true);
  }
}

/** Draw coastline glow (wide outer stroke) then crisp inner stroke for all polylines. */
export function drawCoastlines(
  ctx: CanvasRenderingContext2D,
  coastlines: CoastlinePolyline[],
  toX: ProjectionFn,
  toY: ProjectionFn
): void {
  ctx.strokeStyle = OBLIVION_COLORS.coastlineGlow;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const coastline of coastlines) {
    strokeWrappedPath(ctx, coastline, toX, toY, false);
  }
  ctx.strokeStyle = OBLIVION_COLORS.coastline;
  ctx.lineWidth = 1.5;
  for (const coastline of coastlines) {
    strokeWrappedPath(ctx, coastline, toX, toY, false);
  }
}

/** Draw faint dashed country boundary lines. */
export function drawInteriorBorders(
  ctx: CanvasRenderingContext2D,
  borders: CountryBoundaryLine[],
  toX: ProjectionFn,
  toY: ProjectionFn
): void {
  // Country boundary features are line segments, not closed polygons.
  const shouldClosePath = false;

  // Standard land borders: subtle dashed lines.
  ctx.strokeStyle = 'rgba(200,230,240,0.14)';
  ctx.lineWidth = 0.8;
  ctx.lineCap = 'round';
  ctx.setLineDash([6, 4]);
  for (const border of borders) {
    if (border.style !== 'land' || border.points.length < 2) continue;
    strokeWrappedPath(ctx, border.points, toX, toY, shouldClosePath);
  }

  // Disputed/indefinite borders: finer dotted pattern to distinguish clearly.
  ctx.strokeStyle = 'rgba(200,230,240,0.2)';
  ctx.lineWidth = 0.9;
  ctx.setLineDash([2, 4]);
  for (const border of borders) {
    if (border.style !== 'disputed' || border.points.length < 2) continue;
    strokeWrappedPath(ctx, border.points, toX, toY, shouldClosePath);
  }

  ctx.setLineDash([]);
}
