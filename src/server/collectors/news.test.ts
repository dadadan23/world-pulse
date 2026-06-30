import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewsCollector } from './news';
import axios from 'axios';

vi.mock('axios');
const mockedGet = vi.mocked(axios.get);

function makeResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    data: {
      status: 'ok',
      totalResults: 2,
      articles: [
        {
          source: { id: 'bbc-news', name: 'BBC News' },
          author: 'Jane Doe',
          title: 'Global markets rally',
          description: 'Markets rose today.',
          url: 'https://bbc.com/news/markets-rally',
          publishedAt: '2026-06-29T08:00:00Z',
        },
        {
          source: { id: null, name: 'Reuters' },
          author: null,
          title: 'Summit concludes with agreement',
          description: null,
          url: 'https://reuters.com/world/summit-agreement',
          publishedAt: '2026-06-29T09:00:00Z',
        },
      ],
      ...overrides,
    },
  };
}

describe('NewsCollector', () => {
  let collector: NewsCollector;

  beforeEach(() => {
    collector = new NewsCollector();
    vi.clearAllMocks();
    process.env.NEWSAPI_KEY = 'test-key';
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

    it('returns NewsEvent[] with scope global and stable per-article ids', async () => {
      mockedGet.mockResolvedValueOnce(makeResponse());

      const events = await collector.fetch();

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('news');
      expect(events[0].id).toMatch(/^news-/);
      expect(events[0].location).toBeNull();
      expect(events[0].title).toBe('Global markets rally');
      expect(events[0].data).toMatchObject({
        headline: 'Global markets rally',
        publisher: 'BBC News',
        url: 'https://bbc.com/news/markets-rally',
        scope: 'global',
      });
    });

    it('produces the same id for the same article across polls (de-dup)', async () => {
      mockedGet.mockResolvedValueOnce(makeResponse()).mockResolvedValueOnce(makeResponse());

      const first = await collector.fetch();
      const second = await collector.fetch();

      expect(first[0].id).toBe(second[0].id);
    });

    it('produces different ids for different article URLs', async () => {
      mockedGet.mockResolvedValueOnce(makeResponse());

      const events = await collector.fetch();

      expect(events[0].id).not.toBe(events[1].id);
    });

    it('throws on invalid NewsAPI response', async () => {
      mockedGet.mockResolvedValueOnce({ data: { status: 'error' } });

      await expect(collector.fetch()).rejects.toThrow('Invalid response from NewsAPI');
    });
  });
});
