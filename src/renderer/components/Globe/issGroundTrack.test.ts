import { describe, it, expect } from 'vitest';
import {
  groundTrackHeadingDeg,
  destinationPoint,
  buildIssGroundTrack,
  ISS_ARC_BACK_DEG,
  ISS_ARC_FORWARD_DEG,
} from './issGroundTrack';

describe('groundTrackHeadingDeg', () => {
  it('returns ~38.4 deg at the equator for the ISS inclination (51.64 deg)', () => {
    // sin(heading) = cos(51.64 deg) / cos(0 deg) = cos(51.64 deg)
    expect(groundTrackHeadingDeg(0)).toBeCloseTo(38.36, 1);
  });

  it('approaches 90 deg (due east) at the orbit turning latitude', () => {
    expect(groundTrackHeadingDeg(51.64)).toBeCloseTo(90, 0);
  });

  it('clamps gracefully past the inclination latitude instead of producing NaN', () => {
    expect(Number.isNaN(groundTrackHeadingDeg(60))).toBe(false);
  });
});

describe('destinationPoint', () => {
  it('moves a quarter circle east along the equator', () => {
    const result = destinationPoint(0, 0, 90, Math.PI / 2);
    expect(result.lat).toBeCloseTo(0, 5);
    expect(result.lon).toBeCloseTo(90, 5);
  });

  it('moves due north toward the pole', () => {
    const result = destinationPoint(0, 0, 0, Math.PI / 4);
    expect(result.lat).toBeCloseTo(45, 5);
  });

  it('normalizes longitude to [-180, 180] when crossing the antimeridian', () => {
    const result = destinationPoint(0, 170, 90, (20 * Math.PI) / 180);
    expect(result.lon).toBeCloseTo(-170, 5);
  });
});

describe('buildIssGroundTrack', () => {
  it('returns 25 sampled points (24 segments)', () => {
    expect(buildIssGroundTrack(10, 20)).toHaveLength(25);
  });

  it('the first point trails behind and the last point leads ahead of the current position', () => {
    const heading = groundTrackHeadingDeg(10);
    const track = buildIssGroundTrack(10, 20);

    const expectedFirst = destinationPoint(10, 20, heading, (-ISS_ARC_BACK_DEG * Math.PI) / 180);
    const expectedLast = destinationPoint(10, 20, heading, (ISS_ARC_FORWARD_DEG * Math.PI) / 180);

    expect(track[0].lat).toBeCloseTo(expectedFirst.lat, 5);
    expect(track[0].lon).toBeCloseTo(expectedFirst.lon, 5);
    expect(track[track.length - 1].lat).toBeCloseTo(expectedLast.lat, 5);
    expect(track[track.length - 1].lon).toBeCloseTo(expectedLast.lon, 5);
  });
});
