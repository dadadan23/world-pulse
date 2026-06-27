import { describe, it, expect } from 'vitest';
import { drawGridLines } from './drawLayers';
import { toX, toY } from './projection';

type StrokeCall = {
  strokeStyle: string;
  lineWidth: number;
  dash: number[];
  points: [number, number][];
};

/** Minimal CanvasRenderingContext2D mock that records each stroke() call's style, width, dash, and path. */
function createMockContext(): { ctx: CanvasRenderingContext2D; strokeCalls: StrokeCall[] } {
  const strokeCalls: StrokeCall[] = [];
  let currentPoints: [number, number][] = [];
  let dash: number[] = [];
  const ctx = {
    strokeStyle: '',
    lineWidth: 1,
    setLineDash: (d: number[]) => {
      dash = d;
    },
    beginPath: () => {
      currentPoints = [];
    },
    moveTo: (x: number, y: number) => {
      currentPoints.push([x, y]);
    },
    lineTo: (x: number, y: number) => {
      currentPoints.push([x, y]);
    },
    closePath: () => {},
    stroke: () => {
      strokeCalls.push({
        strokeStyle: ctx.strokeStyle as string,
        lineWidth: ctx.lineWidth,
        dash: [...dash],
        points: [...currentPoints],
      });
    },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, strokeCalls };
}

function alphaOf(rgba: string): number {
  const match = rgba.match(/rgba?\([^)]*,\s*([0-9.]+)\s*\)/);
  return match ? parseFloat(match[1]) : 1;
}

describe('drawGridLines (graticule overlay)', () => {
  const width = 800;
  const height = 400;
  const x = (lon: number) => toX(lon, width);
  const y = (lat: number) => toY(lat, height);

  function isHorizontalAt(call: StrokeCall, lat: number): boolean {
    const targetY = y(lat);
    return (
      call.points.length === 2 &&
      Math.abs(call.points[0][1] - targetY) < 0.01 &&
      Math.abs(call.points[1][1] - targetY) < 0.01
    );
  }

  function isVerticalAt(call: StrokeCall, lon: number): boolean {
    const targetX = x(lon);
    return (
      call.points.length === 2 &&
      Math.abs(call.points[0][0] - targetX) < 0.01 &&
      Math.abs(call.points[1][0] - targetX) < 0.01
    );
  }

  it('draws latitude lines at regular 15-degree intervals', () => {
    const { ctx, strokeCalls } = createMockContext();
    drawGridLines(ctx, width, height, x, y);

    for (let lat = -75; lat <= 75; lat += 15) {
      expect(strokeCalls.some((c) => isHorizontalAt(c, lat))).toBe(true);
    }
  });

  it('draws longitude lines at regular 15-degree intervals', () => {
    const { ctx, strokeCalls } = createMockContext();
    drawGridLines(ctx, width, height, x, y);

    for (let lon = -165; lon <= 180; lon += 15) {
      expect(strokeCalls.some((c) => isVerticalAt(c, lon))).toBe(true);
    }
  });

  it('draws the tropics of Cancer and Capricorn at the correct latitudes', () => {
    const { ctx, strokeCalls } = createMockContext();
    drawGridLines(ctx, width, height, x, y);

    expect(strokeCalls.some((c) => isHorizontalAt(c, 23.5))).toBe(true);
    expect(strokeCalls.some((c) => isHorizontalAt(c, -23.5))).toBe(true);
  });

  it('renders the equator brighter than the tropics, which are brighter than standard parallels', () => {
    const { ctx, strokeCalls } = createMockContext();
    drawGridLines(ctx, width, height, x, y);

    const equatorCall = strokeCalls.find((c) => isHorizontalAt(c, 0) && c.lineWidth === 2);
    const tropicCall = strokeCalls.find((c) => isHorizontalAt(c, 23.5));
    const standardParallelCall = strokeCalls.find((c) => isHorizontalAt(c, 15));

    expect(equatorCall).toBeDefined();
    expect(tropicCall).toBeDefined();
    expect(standardParallelCall).toBeDefined();

    const equatorAlpha = alphaOf(equatorCall!.strokeStyle);
    const tropicAlpha = alphaOf(tropicCall!.strokeStyle);
    const standardAlpha = alphaOf(standardParallelCall!.strokeStyle);

    expect(equatorAlpha).toBeGreaterThan(tropicAlpha);
    expect(tropicAlpha).toBeGreaterThan(standardAlpha);
  });

  it('keeps every graticule line at low opacity so coastlines remain dominant', () => {
    const { ctx, strokeCalls } = createMockContext();
    drawGridLines(ctx, width, height, x, y);

    for (const call of strokeCalls) {
      expect(alphaOf(call.strokeStyle)).toBeLessThanOrEqual(0.25);
    }
  });

  it('resets line dash after drawing each dashed group', () => {
    const { ctx, strokeCalls } = createMockContext();
    drawGridLines(ctx, width, height, x, y);

    const equatorCall = strokeCalls.find((c) => isHorizontalAt(c, 0) && c.lineWidth === 2);
    expect(equatorCall?.dash).toEqual([]);
  });
});
