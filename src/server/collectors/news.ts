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

export class NewsCollector extends BaseCollector {
  private readonly apiUrl = 'https://newsapi.org/v2/top-headlines';

  constructor() {
    super('Global Headlines', 'news', 15 * 60 * 1000); // 15 minutes
  }

  async fetch(): Promise<Event[]> {
    const apiKey = process.env.NEWSAPI_KEY;
    if (!apiKey) {
      throw new Error('NEWSAPI_KEY not configured');
    }

    const response = await axios.get<NewsAPIResponse>(this.apiUrl, {
      params: { language: 'en', pageSize: 10, apiKey },
      timeout: 10000,
    });

    if (!this.validate(response.data)) {
      throw new Error('Invalid response from NewsAPI');
    }

    return response.data.articles.map((article) => this.transform(article));
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

  private transform(article: NewsAPIArticle): NewsEvent {
    return {
      id: `news-${hashString(article.url)}`,
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
        scope: 'global',
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
