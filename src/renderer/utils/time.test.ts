import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime } from './time';

describe('formatRelativeTime', () => {
  const NOW = new Date('2026-07-01T12:00:00Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "now" for timestamps under a minute old', () => {
    expect(formatRelativeTime(NOW - 30_000)).toBe('now');
  });

  it('returns minutes ago for timestamps under an hour old', () => {
    expect(formatRelativeTime(NOW - 5 * 60_000)).toBe('5m ago');
  });

  it('returns hours ago for timestamps under a day old', () => {
    expect(formatRelativeTime(NOW - 3 * 3_600_000)).toBe('3h ago');
  });

  it('returns days ago for timestamps a day or more old', () => {
    expect(formatRelativeTime(NOW - 2 * 86_400_000)).toBe('2d ago');
  });
});
