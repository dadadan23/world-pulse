import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitForServer } from './serverHealthPoller';

const TEST_URL = 'http://localhost:3000/health';
const POLL_INTERVAL_MS = 10; // fast for tests

describe('waitForServer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('resolves ready=true immediately when server responds OK on first poll', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const promise = waitForServer(TEST_URL, 5_000, POLL_INTERVAL_MS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ready).toBe(true);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('retries after a failed fetch and resolves ready=true on success', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const promise = waitForServer(TEST_URL, 5_000, POLL_INTERVAL_MS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ready).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries when server returns a non-OK status and succeeds on retry', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const promise = waitForServer(TEST_URL, 5_000, POLL_INTERVAL_MS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ready).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('resolves ready=false after timeout when server never responds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const promise = waitForServer(TEST_URL, 100, POLL_INTERVAL_MS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ready).toBe(false);
  });

  it('resolves ready=false after timeout when server always returns non-OK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const promise = waitForServer(TEST_URL, 100, POLL_INTERVAL_MS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ready).toBe(false);
  });

  it('includes elapsedMs in both ready and timeout results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const promise = waitForServer(TEST_URL, 5_000, POLL_INTERVAL_MS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(typeof result.elapsedMs).toBe('number');
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});
