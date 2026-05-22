import { describe, it, expect } from 'vitest';
import { lonToGlobeRotationY, shortestAngleDiff } from './globeRotation';

describe('lonToGlobeRotationY', () => {
  it('returns 0 for lon=-90 (marker already faces +Z camera)', () => {
    expect(lonToGlobeRotationY(-90)).toBeCloseTo(0);
  });

  it('returns -PI/2 for lon=0', () => {
    expect(lonToGlobeRotationY(0)).toBeCloseTo(-Math.PI / 2);
  });

  it('returns -PI for lon=90', () => {
    expect(lonToGlobeRotationY(90)).toBeCloseTo(-Math.PI);
  });

  it('returns PI/2 for lon=-180', () => {
    expect(lonToGlobeRotationY(-180)).toBeCloseTo(Math.PI / 2);
  });

  it('produces distinct rotations for different longitude quadrants', () => {
    // Each 90-degree longitude step should produce a 90-degree rotation difference
    const r0 = lonToGlobeRotationY(-90); // 0
    const r1 = lonToGlobeRotationY(0); // -PI/2
    const r2 = lonToGlobeRotationY(90); // -PI
    expect(r0).toBeCloseTo(0);
    expect(r1).toBeCloseTo(-Math.PI / 2);
    expect(r2).toBeCloseTo(-Math.PI);
  });

  it('produces unique rotations for distinct longitudes', () => {
    const a = lonToGlobeRotationY(0);
    const b = lonToGlobeRotationY(45);
    expect(a).not.toBeCloseTo(b);
  });

  it('satisfies the derivation: ry = -(90 + lon) * PI/180', () => {
    const lons = [-120, -60, 30, 75, 150];
    for (const lon of lons) {
      expect(lonToGlobeRotationY(lon)).toBeCloseTo(-(90 + lon) * (Math.PI / 180));
    }
  });
});

describe('shortestAngleDiff', () => {
  it('returns 0 when from equals to', () => {
    expect(shortestAngleDiff(0, 0)).toBeCloseTo(0);
    expect(shortestAngleDiff(Math.PI, Math.PI)).toBeCloseTo(0);
  });

  it('returns positive diff when turning counterclockwise is shorter', () => {
    // from=0 to=PI/2: diff = +PI/2
    expect(shortestAngleDiff(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
  });

  it('returns negative diff when turning clockwise is shorter', () => {
    // from=0 to=-PI/2 (=3PI/2 normalized): shortest path is -PI/2
    expect(shortestAngleDiff(0, -Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
  });

  it('wraps correctly across 0/2PI boundary', () => {
    // from = 2PI-0.1 (just below 2PI) to = 0.1 (just above 0)
    // shortest diff is +0.2, not -2PI+0.2
    expect(shortestAngleDiff(2 * Math.PI - 0.1, 0.1)).toBeCloseTo(0.2);
  });

  it('wraps correctly in the negative direction', () => {
    // from=0.1 to=2PI-0.1: shortest is -0.2
    expect(shortestAngleDiff(0.1, 2 * Math.PI - 0.1)).toBeCloseTo(-0.2);
  });

  it('handles accumulated rotation (beyond 2PI) as from', () => {
    // from=5PI (accumulated rotation) to=0 target: same as from=PI to=0 => -PI
    // but shortest path from PI to 0 is -PI or +PI (ambiguous), result should be +-PI
    const diff = shortestAngleDiff(5 * Math.PI, 0);
    expect(Math.abs(diff)).toBeCloseTo(Math.PI);
  });

  it('stays in (-PI, PI] range', () => {
    const pairs: [number, number][] = [
      [0, Math.PI],
      [Math.PI, 0],
      [-Math.PI, Math.PI],
      [3 * Math.PI, -Math.PI],
      [0.5, 2 * Math.PI - 0.5],
    ];
    for (const [from, to] of pairs) {
      const diff = shortestAngleDiff(from, to);
      expect(diff).toBeGreaterThan(-Math.PI - 1e-9);
      expect(diff).toBeLessThanOrEqual(Math.PI + 1e-9);
    }
  });
});
