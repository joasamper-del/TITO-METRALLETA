/**
 * NewsAPI Provider - Real-time Financial News
 *
 * Fetches recent news for a ticker and calculates:
 * - Sentiment (positive/negative/neutral)
 * - Relevance score (0-100)
 * - Category classification
 *
 * Used by WebResearchService as primary news source
 * with automatic fallback to secondary/tertiary providers
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { NewsItem, NewsProvider } from '../types/research.types';

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: Array<{
    source: { id?: string; name: string };
    author?: string;
    title: string;
    description?: string;
    url: string;
    urlToImage?: string;
    publishedAt: string;
    content?: string;
  }>;
}

@Injectable()
export class NewsAPIProvider implements NewsProvider {
  private readonly logger = new Logger(NewsAPIProvider.name);
  private readonly apiKey = process.env.NEWSAPI_KEY;
  private readonly baseUrl = 'https://newsapi.org/v2';
  private readonly rateLimitDelay = 100; // ms between requests
  private lastRequestTime = 0;

  constructor(private readonly http: HttpService) {
    if (!this.apiKey) {
      this.logger.warn('NewsAPI key not configured. Provider will not function.');
    }
  }

  async fetchNews(ticker: string): Promise<NewsItem[]> {
    try {
      if (!this.apiKey) {
        throw new Error('NewsAPI key not configured');
      }

      // Respect rate limits
      await this.respectRateLimit();

      // Search for recent news about ticker
      const query = `${ticker} stock market`;
      const url = `${this.baseUrl}/everything`;

      const params = {
        q: query,
        sortBy: 'publishedAt',
        language: 'en',
        pageSize: 10,
        apiKey: '***MASKED***', // Never log full key
      };

      this.logger.debug(`Fetching news for ${ticker} from NewsAPI`);

      const response = await firstValueFrom(
        this.http.get<NewsAPIResponse>(url, {
          params: {
            q: query,
            sortBy: 'publishedAt',
            language: 'en',
            pageSize: 10,
            apiKey: this.apiKey,
          },
        })
      );

      if (response.data.status !== 'ok') {
        throw new Error(`NewsAPI error: ${response.data.status}`);
      }

      // Parse articles into NewsItem format
      const newsItems: NewsItem[] = response.data.articles.map(article => ({
        title: article.title,
        source: article.source.name,
        url: article.url,
        publishedAt: new Date(article.publishedAt),
        summary: article.description || article.content?.substring(0, 200) || '',
        sentiment: this.analyzeSentiment(article.title, article.description || ''),
        relevanceScore: this.calculateRelevance(article.title, ticker),
        categories: this.classifyCategories(article.title, article.description || ''),
      }));

      this.logger.log(`Fetched ${newsItems.length} news items for ${ticker}`);
      return newsItems;
    } catch (error) {
      this.logger.error(`NewsAPI fetch failed: ${error.message}`);
      throw new HttpException(
        `NewsAPI provider error: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * SENTIMENT ANALYSIS
   * Simple lexicon-based approach
   */
  private analyzeSentiment(title: string, description: string): 'positive' | 'negative' | 'neutral' {
    const text = `${title} ${description}`.toLowerCase();

    const positiveWords = [
      'surge', 'soar', 'rally', 'gain', 'profit', 'bull', 'bullish',
      'recovery', 'rebound', 'upgrade', 'outperform', 'beat', 'strong',
      'growth', 'expansion', 'record', 'win', 'success', 'positive'
    ];

    const negativeWords = [
      'crash', 'plunge', 'decline', 'fall', 'loss', 'bear', 'bearish',
      'recession', 'collapse', 'downgrade', 'underperform', 'miss', 'weak',
      'decline', 'contraction', 'negative', 'risk', 'warn', 'struggle'
    ];

    let positiveScore = 0;
    let negativeScore = 0;

    positiveWords.forEach(word => {
      if (text.includes(word)) positiveScore++;
    });

    negativeWords.forEach(word => {
      if (text.includes(word)) negativeScore++;
    });

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  /**
   * RELEVANCE SCORE
   * How directly does this article mention the ticker?
   */
  private calculateRelevance(title: string, ticker: string): number {
    const lowerTitle = title.toLowerCase();
    const lowerTicker = ticker.toLowerCase();

    let score = 0;

    // Exact ticker mention: 100 points
    if (lowerTitle.includes(lowerTicker)) {
      score += 50;
    }

    // Ticker at start: +25
    if (lowerTitle.startsWith(lowerTicker)) {
      score += 25;
    }

    // Stock/equity keywords: +15
    if (lowerTitle.includes('stock') || lowerTitle.includes('share')) {
      score += 15;
    }

    // Market/trading keywords: +10
    if (lowerTitle.includes('market') || lowerTitle.includes('trading')) {
      score += 10;
    }

    // Earnings/financial keywords: +20
    if (lowerTitle.includes('earnings') || lowerTitle.includes('profit') ||
        lowerTitle.includes('revenue') || lowerTitle.includes('ipo')) {
      score += 20;
    }

    return Math.min(100, score);
  }

  /**
   * CATEGORY CLASSIFICATION
   * Classify news into categories
   */
  private classifyCategories(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const categories: string[] = [];

    const categoryKeywords = {
      earnings: ['earnings', 'profit', 'revenue', 'ebitda', 'income'],
      acquisition: ['acquire', 'merger', 'buyout', 'acquisition', 'deal'],
      ipo: ['ipo', 'public', 'listing', 'debut'],
      regulation: ['sec', 'regulation', 'antitrust', 'fine', 'lawsuit'],
      product: ['product', 'launch', 'release', 'announcement'],
      leadership: ['ceo', 'executive', 'management', 'leadership change'],
      macro: ['fed', 'interest rate', 'inflation', 'gdp', 'unemployment'],
      geopolitical: ['war', 'trade', 'tariff', 'sanctions', 'politics'],
    };

    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
      if (keywords.some(kw => text.includes(kw))) {
        categories.push(category);
      }
    });

    return categories.length > 0 ? categories : ['general'];
  }

  /**
   * RATE LIMITING
   * Respect NewsAPI rate limits (100 req/day for free tier)
   */
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * PROVIDER METADATA
   */
  getName(): string {
    return 'NewsAPI';
  }

  getType(): string {
    return 'news';
  }

  getPriority(): number {
    return 1; // Primary news source
  }

  isHealthy(): boolean {
    return !!this.apiKey;
  }

  getLastCheckTime(): Date {
    return new Date();
  }

  getResponseTimeMs(): number {
    // Typical NewsAPI response time
    return 500;
  }
}
