/**
 * Global Headline News Collector
 * Fetches top headlines from NewsAPI.
 * API: https://newsapi.org/v2/top-headlines
 */

import axios from 'axios';
import type { Event, NewsEvent } from '@shared/types';
import { BaseCollector } from './base';

export interface NewsAPIArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
}

export interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

interface IPGeoResponse {
  country_code: string;
}

export class NewsCollector extends BaseCollector {
  private readonly apiUrl = 'https://newsapi.org/v2/top-headlines';
  private readonly ipGeoUrl = 'https://ipapi.co/json/';
  private cachedCountryCode?: string;

  constructor() {
    super('Global Headlines', 'news', 15 * 60 * 1000); // 15 minutes
  }

  async fetch(): Promise<Event[]> {
    const apiKey = process.env.NEWSAPI_KEY;
    if (!apiKey) {
      throw new Error('NEWSAPI_KEY not configured');
    }

    if (!this.cachedCountryCode) {
      this.cachedCountryCode = await this.detectCountryCode();
    }

    const results = await Promise.allSettled([
      this.fetchHeadlines(apiKey, 'global'),
      this.fetchHeadlines(apiKey, 'local', this.cachedCountryCode),
    ]);

    // Only fail the whole poll (and count toward BaseCollector's backoff) when
    // both feeds fail; a single feed's failure shouldn't discard the other's headlines.
    if (results.every((result) => result.status === 'rejected')) {
      const reason = (results[0] as PromiseRejectedResult).reason;
      throw reason instanceof Error ? reason : new Error(String(reason));
    }

    return results.flatMap((result) => {
      if (result.status === 'fulfilled') return result.value;
      console.error('[NewsCollector] Headline fetch failed:', result.reason);
      return [];
    });
  }

  validate(data: unknown): data is NewsAPIResponse {
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as Partial<NewsAPIResponse>;
    return (
      obj.status === 'ok' &&
      Array.isArray(obj.articles) &&
      obj.articles.every(
        (article) => typeof article?.title === 'string' && typeof article?.url === 'string'
      )
    );
  }

  private async fetchHeadlines(
    apiKey: string,
    scope: 'global' | 'local',
    countryCode?: string
  ): Promise<NewsEvent[]> {
    const params: Record<string, string | number> =
      scope === 'global'
        ? { language: 'en', pageSize: 10, apiKey }
        : { country: countryCode!, pageSize: 10, apiKey };

    const response = await axios.get<NewsAPIResponse>(this.apiUrl, { params, timeout: 10000 });

    if (!this.validate(response.data)) {
      throw new Error(`Invalid response from NewsAPI (${scope})`);
    }

    return response.data.articles.map((article) => this.transform(article, scope));
  }

  private async detectCountryCode(): Promise<string> {
    try {
      const res = await axios.get<IPGeoResponse>(this.ipGeoUrl, { timeout: 5000 });
      return res.data?.country_code || 'GB';
    } catch (_err) {
      console.warn('[NewsCollector] IP geolocation failed, defaulting to GB');
      return 'GB';
    }
  }

  private transform(article: NewsAPIArticle, scope: 'global' | 'local'): NewsEvent {
    return {
      id:
        scope === 'global'
          ? `news-${hashString(article.url)}`
          : `news-local-${hashString(article.url)}`,
      timestamp: Date.parse(article.publishedAt) || Date.now(),
      type: 'news',
      source: article.source.name,
      location: null,
      title: article.title,
      description: article.description ?? undefined,
      data: {
        headline: article.title,
        publisher: article.source.name,
        url: article.url,
        category: 'general',
        scope,
      },
    };
  }
}

/**
 * Stable short hash for deterministic, de-dup-friendly event IDs from article URLs.
 */
function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
