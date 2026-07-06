import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewsCollector } from './news';
import { setLocationOverride } from '../locationOverride';
import axios from 'axios';

vi.mock('axios');
const mockedGet = vi.mocked(axios.get);

function makeArticle(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    source: { id: 'bbc-news', name: 'BBC News' },
    author: 'Jane Doe',
    title: 'Global markets rally',
    description: 'Markets rose today.',
    url: 'https://bbc.com/news/markets-rally',
    publishedAt: '2026-06-29T08:00:00Z',
    ...overrides,
  };
}

function makeResponse(
  articles = [makeArticle()],
  overrides: Partial<Record<string, unknown>> = {}
) {
  return {
    data: {
      status: 'ok',
      totalResults: articles.length,
      articles,
      ...overrides,
    },
  };
}

const GEO_RESPONSE = { data: { country_code: 'DE' } };

/** Routes axios.get calls by URL/params so global, local and geo-lookup calls can return distinct fixtures. */
function mockHeadlineRoutes(opts: {
  geo?: ReturnType<typeof Promise.resolve> | typeof GEO_RESPONSE | (() => never);
  global?: ReturnType<typeof makeResponse>;
  local?: ReturnType<typeof makeResponse>;
}) {
  mockedGet.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => {
    if (url.includes('ipapi.co')) {
      if (typeof opts.geo === 'function') return (opts.geo as () => never)();
      return Promise.resolve(opts.geo ?? GEO_RESPONSE);
    }
    if (config?.params?.country) {
      return Promise.resolve(
        opts.local ??
          makeResponse([makeArticle({ url: 'https://local.example/x', title: 'Local story' })])
      );
    }
    return Promise.resolve(opts.global ?? makeResponse());
  });
}

describe('NewsCollector', () => {
  let collector: NewsCollector;

  beforeEach(() => {
    collector = new NewsCollector();
    vi.clearAllMocks();
    process.env.NEWSAPI_KEY = 'test-key';
    setLocationOverride(null);
  });

  describe('constructor', () => {
    it('has correct name and type', () => {
      expect(collector.name).toBe('Global Headlines');
      expect(collector.type).toBe('news');
    });

    it('is enabled by default', () => {
      expect(collector.enabled).toBe(true);
    });

    it('uses 15-minute interval', () => {
      expect(collector.interval).toBe(15 * 60 * 1000);
    });
  });

  describe('validate', () => {
    it('accepts a valid NewsAPI response', () => {
      expect(collector.validate(makeResponse().data)).toBe(true);
    });

    it('rejects null', () => {
      expect(collector.validate(null)).toBe(false);
    });

    it('rejects a non-ok status', () => {
      expect(collector.validate({ status: 'error', articles: [] })).toBe(false);
    });

    it('rejects articles missing a title or url', () => {
      expect(
        collector.validate({
          status: 'ok',
          articles: [{ source: { name: 'X' }, url: 'https://x.com' }],
        })
      ).toBe(false);
    });
  });

  describe('fetch', () => {
    it('throws when API key is missing', async () => {
      delete process.env.NEWSAPI_KEY;
      await expect(collector.fetch()).rejects.toThrow('NEWSAPI_KEY not configured');
    });

    it('returns global events with scope global and stable per-article ids', async () => {
      mockHeadlineRoutes({});

      const events = await collector.fetch();
      const globalEvents = events.filter((e) => e.data.scope === 'global');

      expect(globalEvents).toHaveLength(1);
      expect(globalEvents[0].type).toBe('news');
      expect(globalEvents[0].id).toMatch(/^news-/);
      expect(globalEvents[0].location).toBeNull();
      expect(globalEvents[0].title).toBe('Global markets rally');
      expect(globalEvents[0].data).toMatchObject({
        headline: 'Global markets rally',
        publisher: 'BBC News',
        url: 'https://bbc.com/news/markets-rally',
        scope: 'global',
      });
    });

    it('returns local events tagged scope local using the IP-detected country code', async () => {
      mockHeadlineRoutes({});

      const events = await collector.fetch();
      const localEvents = events.filter((e) => e.data.scope === 'local');

      expect(localEvents).toHaveLength(1);
      expect(localEvents[0].data.scope).toBe('local');
      expect(localEvents[0].title).toBe('Local story');

      const localCall = mockedGet.mock.calls.find(
        ([, config]) => (config as { params?: Record<string, unknown> })?.params?.country
      );
      expect(localCall?.[1]).toMatchObject({ params: { country: 'DE' } });
    });

    it('caches the detected country code across multiple fetches (only one geo lookup)', async () => {
      mockHeadlineRoutes({});

      await collector.fetch();
      await collector.fetch();

      const geoCalls = mockedGet.mock.calls.filter(([url]) => (url as string).includes('ipapi.co'));
      expect(geoCalls).toHaveLength(1);
    });

    it('falls back to GB when geolocation fails, mirroring the weather collector default', async () => {
      mockHeadlineRoutes({ geo: () => Promise.reject(new Error('network error')) as never });

      const events = await collector.fetch();
      const localEvents = events.filter((e) => e.data.scope === 'local');

      expect(localEvents).toHaveLength(1);
      const localCall = mockedGet.mock.calls.find(
        ([, config]) => (config as { params?: Record<string, unknown> })?.params?.country
      );
      expect(localCall?.[1]).toMatchObject({ params: { country: 'GB' } });
    });

    it('falls back to GB when the geolocation response is missing country_code', async () => {
      mockHeadlineRoutes({ geo: { data: {} } as typeof GEO_RESPONSE });

      await collector.fetch();

      const localCall = mockedGet.mock.calls.find(
        ([, config]) => (config as { params?: Record<string, unknown> })?.params?.country
      );
      expect(localCall?.[1]).toMatchObject({ params: { country: 'GB' } });
    });

    it('produces the same id for the same article across polls (de-dup)', async () => {
      mockHeadlineRoutes({});

      const first = await collector.fetch();
      const second = await collector.fetch();

      expect(first[0].id).toBe(second[0].id);
    });

    it('produces different ids for global vs. local scope of the same-shaped article', async () => {
      mockHeadlineRoutes({
        global: makeResponse([makeArticle({ url: 'https://same.example/a' })]),
        local: makeResponse([makeArticle({ url: 'https://same.example/a' })]),
      });

      const events = await collector.fetch();

      expect(events[0].id).not.toBe(events[1].id);
    });

    it('returns local-only events when only the global fetch fails, without discarding local headlines', async () => {
      mockHeadlineRoutes({
        global: { data: { status: 'error' } } as ReturnType<typeof makeResponse>,
      });

      const events = await collector.fetch();

      expect(events.every((e) => e.data.scope === 'local')).toBe(true);
      expect(events).toHaveLength(1);
    });

    it('returns global-only events when only the local fetch fails, without discarding global headlines', async () => {
      mockHeadlineRoutes({
        local: { data: { status: 'error' } } as ReturnType<typeof makeResponse>,
      });

      const events = await collector.fetch();

      expect(events.every((e) => e.data.scope === 'global')).toBe(true);
      expect(events).toHaveLength(1);
    });

    it('throws when both global and local fetches fail', async () => {
      mockHeadlineRoutes({
        global: { data: { status: 'error' } } as ReturnType<typeof makeResponse>,
        local: { data: { status: 'error' } } as ReturnType<typeof makeResponse>,
      });

      await expect(collector.fetch()).rejects.toThrow('Invalid response from NewsAPI');
    });

    it('wraps a non-Error rejection reason in an Error when both fetches fail', async () => {
      mockedGet.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => {
        if (url.includes('ipapi.co')) return Promise.resolve(GEO_RESPONSE);
        // Simulate a rejection with a non-Error value (e.g. a raw string thrown by a mock/library).
        return Promise.reject(config?.params?.country ? 'local failure' : 'global failure');
      });

      await expect(collector.fetch()).rejects.toBeInstanceOf(Error);
      await expect(collector.fetch()).rejects.toThrow(/global failure|local failure/);
    });
  });

  describe('location override (#234)', () => {
    it('uses the override country code instead of calling ipapi.co', async () => {
      setLocationOverride({ lat: 48.86, lon: 2.35, name: 'Paris, FR', countryCode: 'fr' });
      mockHeadlineRoutes({});

      const events = await collector.fetch();
      const localEvents = events.filter((e) => e.data.scope === 'local');

      expect(localEvents).toHaveLength(1);
      const geoCalls = mockedGet.mock.calls.filter(([url]) => (url as string).includes('ipapi.co'));
      expect(geoCalls).toHaveLength(0);
      const localCall = mockedGet.mock.calls.find(
        ([, config]) => (config as { params?: Record<string, unknown> })?.params?.country
      );
      expect(localCall?.[1]).toMatchObject({ params: { country: 'FR' } });
    });

    it('falls back to GB when the override has no country code, without calling ipapi.co', async () => {
      setLocationOverride({ lat: 48.86, lon: 2.35, name: 'Paris, FR' });
      mockHeadlineRoutes({});

      await collector.fetch();

      const geoCalls = mockedGet.mock.calls.filter(([url]) => (url as string).includes('ipapi.co'));
      expect(geoCalls).toHaveLength(0);
      const localCall = mockedGet.mock.calls.find(
        ([, config]) => (config as { params?: Record<string, unknown> })?.params?.country
      );
      expect(localCall?.[1]).toMatchObject({ params: { country: 'GB' } });
    });

    it('resumes IP geolocation once the override is cleared', async () => {
      setLocationOverride({ lat: 48.86, lon: 2.35, countryCode: 'fr' });
      mockHeadlineRoutes({});
      await collector.fetch();

      setLocationOverride(null);
      await collector.fetch();

      const geoCalls = mockedGet.mock.calls.filter(([url]) => (url as string).includes('ipapi.co'));
      expect(geoCalls).toHaveLength(1);
    });
  });
});
