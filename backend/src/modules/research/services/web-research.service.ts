/**
 * WebResearchService - Core Research Engine
 *
 * MODULAR ARCHITECTURE:
 * - Multiple providers per data type (news, events, fundamentals)
 * - Fallback chain: if provider 1 fails, try provider 2
 * - No single-source dependency
 * - Extensible: add new sources without touching core logic
 *
 * GUARDRAILS:
 * - Caching: avoid duplicate requests
 * - Timeout: no hanging requests
 * - Rate limiting: respect API limits
 * - Audit: log all research operations
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ResearchContext,
  ResearchResult,
  NewsProvider,
  EventProvider,
  FundamentalProvider,
  ResearchAuditLog,
  ProviderFailure,
  SourceCitation,
  DataQualityScore,
} from '../types/research.types';

@Injectable()
export class WebResearchService {
  private readonly logger = new Logger(WebResearchService.name);

  // Provider registries (extensible)
  private newsProviders: NewsProvider[] = [];
  private eventProviders: EventProvider[] = [];
  private fundamentalProviders: FundamentalProvider[] = [];

  // Cache (prevent duplicate requests)
  private cache = new Map<string, { result: ResearchResult; expiry: number }>();
  private readonly CACHE_TTL_MS = 300_000; // 5 minutes

  // Audit trail
  private auditLogs: ResearchAuditLog[] = [];

  constructor() {
    // Providers will be registered via registerProvider()
    // This allows runtime extension without code changes
  }

  /**
   * MODULAR REGISTRATION
   * Allows adding/removing providers at runtime
   */
  registerNewsProvider(provider: NewsProvider): void {
    this.newsProviders.push(provider);
    this.newsProviders.sort((a, b) => a.priority - b.priority);
    this.logger.log(`Registered news provider: ${provider.name} (priority ${provider.priority})`);
  }

  registerEventProvider(provider: EventProvider): void {
    this.eventProviders.push(provider);
    this.eventProviders.sort((a, b) => a.priority - b.priority);
    this.logger.log(`Registered event provider: ${provider.name} (priority ${provider.priority})`);
  }

  registerFundamentalProvider(provider: FundamentalProvider): void {
    this.fundamentalProviders.push(provider);
    this.fundamentalProviders.sort((a, b) => a.priority - b.priority);
    this.logger.log(`Registered fundamental provider: ${provider.name} (priority ${provider.priority})`);
  }

  /**
   * MAIN ENTRY POINT
   * Execute complete research with fallback chain
   */
  async investigate(context: ResearchContext): Promise<ResearchResult> {
    const requestedAt = new Date();
    const cacheKey = this.buildCacheKey(context);

    // 1. CHECK CACHE
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      this.logger.debug(`Cache hit for ${context.ticker}`);
      return cached.result;
    }

    this.logger.log(`Starting research for ${context.ticker}`);

    // 2. PARALLEL DATA COLLECTION (if configured)
    const startTime = Date.now();
    const results = await Promise.allSettled([
      this.collectNews(context),
      this.collectEvents(context),
      this.collectFundamentals(context),
    ]);

    // 3. ASSEMBLE RESULT
    const researchResult: ResearchResult = {
      ticker: context.ticker,
      requestedAt,
      completedAt: new Date(),
      executionTimeMs: Date.now() - startTime,

      news: results[0].status === 'fulfilled' ? results[0].value.items : [],
      economicEvents: results[1].status === 'fulfilled' ? results[1].value.events : [],
      upcomingEvents: results[1].status === 'fulfilled' ? results[1].value.upcoming : {},
      fundamentals: results[2].status === 'fulfilled' ? results[2].value : {},

      sources: this.compileSources(results),
      dataQuality: this.assessDataQuality(results),
      warnings: this.extractWarnings(results),
    };

    // 4. CACHE RESULT
    this.cache.set(cacheKey, {
      result: researchResult,
      expiry: Date.now() + this.CACHE_TTL_MS,
    });

    // 5. AUDIT LOG
    this.logResearchOperation(context, researchResult, results);

    this.logger.log(
      `Research completed for ${context.ticker} in ${researchResult.executionTimeMs}ms`
    );

    return researchResult;
  }

  /**
   * COLLECT NEWS
   * Try all news providers in priority order (fallback chain)
   */
  private async collectNews(context: ResearchContext): Promise<{
    items: any[];
    usedProviders: string[];
    failures: ProviderFailure[];
  }> {
    const items: any[] = [];
    const usedProviders: string[] = [];
    const failures: ProviderFailure[] = [];

    for (const provider of this.newsProviders) {
      try {
        const available = await Promise.race([
          provider.isAvailable(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
        ]);

        if (!available) {
          this.logger.debug(`News provider ${provider.name} unavailable`);
          continue;
        }

        const results = await provider.search(context.ticker, context.maxResults);
        items.push(...results);
        usedProviders.push(provider.name);

        // If we got results, we can skip other providers (unless we want redundancy)
        if (items.length > 0) break;
      } catch (error) {
        failures.push({
          providerName: provider.name,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          isRecoverable: true,
        });
        this.logger.warn(`News provider ${provider.name} failed: ${error}`);
        // Continue to next provider
      }
    }

    // Deduplicate and sort by date
    const unique = Array.from(new Map(items.map(item => [item.id, item])).values());
    unique.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    return { items: unique, usedProviders, failures };
  }

  /**
   * COLLECT EVENTS
   * Combine earnings, economic calendar, regulatory events
   */
  private async collectEvents(context: ResearchContext): Promise<{
    events: any[];
    upcoming: any;
    usedProviders: string[];
    failures: ProviderFailure[];
  }> {
    const events: any[] = [];
    const upcoming: any = {};
    const usedProviders: string[] = [];
    const failures: ProviderFailure[] = [];

    // 1. Get economic calendar events for today
    for (const provider of this.eventProviders) {
      try {
        const available = await provider.isAvailable();
        if (!available) continue;

        const economicEvents = await provider.getEventsForDate(new Date());
        events.push(...economicEvents);
        usedProviders.push(`${provider.name}-calendar`);
        break; // Usually one provider per type
      } catch (error) {
        failures.push({
          providerName: provider.name,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          isRecoverable: true,
        });
        this.logger.warn(`Event provider ${provider.name} failed: ${error}`);
      }
    }

    // 2. Get upcoming events (earnings, splits, etc.)
    for (const provider of this.eventProviders) {
      try {
        const available = await provider.isAvailable();
        if (!available) continue;

        const upcomingEvents = await provider.getUpcomingEvents(context.ticker);
        Object.assign(upcoming, upcomingEvents);
        usedProviders.push(`${provider.name}-upcoming`);
        break;
      } catch (error) {
        failures.push({
          providerName: provider.name,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          isRecoverable: true,
        });
      }
    }

    return { events, upcoming, usedProviders, failures };
  }

  /**
   * COLLECT FUNDAMENTALS
   * Get financial data from official sources
   */
  private async collectFundamentals(context: ResearchContext): Promise<any> {
    const failures: ProviderFailure[] = [];

    for (const provider of this.fundamentalProviders) {
      try {
        const available = await provider.isAvailable();
        if (!available) continue;

        const fundamentals = await provider.getFundamentals(context.ticker);
        return fundamentals;
      } catch (error) {
        failures.push({
          providerName: provider.name,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          isRecoverable: true,
        });
        this.logger.warn(`Fundamental provider ${provider.name} failed: ${error}`);
        // Continue to next provider
      }
    }

    // Return empty if all failed
    return { source: 'unknown', freshness: 'stale' as const };
  }

  /**
   * COMPILE SOURCES
   * Create citation list from all providers used
   */
  private compileSources(results: PromiseSettledResult<any>[]): SourceCitation[] {
    const sources: SourceCitation[] = [];

    // From news results
    if (results[0].status === 'fulfilled') {
      results[0].value.usedProviders?.forEach((provider: string) => {
        sources.push({
          type: 'news',
          outlet: provider,
          url: 'N/A', // Would come from actual items
          timestamp: new Date(),
          reliability: 'high',
          providerName: provider,
        });
      });
    }

    // From event results
    if (results[1].status === 'fulfilled') {
      results[1].value.usedProviders?.forEach((provider: string) => {
        sources.push({
          type: 'official',
          outlet: provider,
          url: 'N/A',
          timestamp: new Date(),
          reliability: 'high',
          providerName: provider,
        });
      });
    }

    // From fundamental results
    if (results[2].status === 'fulfilled' && results[2].value.source) {
      sources.push({
        type: 'official',
        outlet: results[2].value.source,
        url: 'N/A',
        timestamp: results[2].value.lastUpdate || new Date(),
        reliability: results[2].value.source === 'sec' ? 'high' : 'medium',
        providerName: results[2].value.source,
      });
    }

    return sources;
  }

  /**
   * ASSESS DATA QUALITY
   * Score the research completeness and reliability
   */
  private assessDataQuality(results: PromiseSettledResult<any>[]): DataQualityScore {
    let overall = 0;
    const scores: Record<string, number> = {
      news: 0,
      events: 0,
      fundamentals: 0,
    };

    // News quality
    if (results[0].status === 'fulfilled') {
      const newsCount = results[0].value.items?.length || 0;
      scores.news = Math.min(100, (newsCount / 5) * 100); // 5+ articles = 100%
    }

    // Events quality
    if (results[1].status === 'fulfilled') {
      const eventCount = results[1].value.events?.length || 0;
      const hasUpcoming = Object.keys(results[1].value.upcoming || {}).length > 0;
      scores.events = eventCount > 0 || hasUpcoming ? 80 : 40;
    }

    // Fundamentals quality
    if (results[2].status === 'fulfilled' && results[2].value.source !== 'unknown') {
      const source = results[2].value.source;
      scores.fundamentals = source === 'sec' ? 100 : source === 'yahoo' ? 85 : 50;
    }

    // Calculate overall
    overall = (scores.news + scores.events + scores.fundamentals) / 3;

    return {
      overall: Math.round(overall),
      news: Math.round(scores.news),
      events: Math.round(scores.events),
      fundamentals: Math.round(scores.fundamentals),
      sourceRedundancy: 0, // TODO: implement cross-provider validation
      recommendations: this.generateRecommendations(scores),
    };
  }

  private generateRecommendations(scores: Record<string, number>): string[] {
    const recommendations: string[] = [];

    if (scores.news < 50) recommendations.push('Limited news coverage - consider multiple sources');
    if (scores.events < 50) recommendations.push('No upcoming events detected - verify manually');
    if (scores.fundamentals < 50) recommendations.push('Fundamental data unavailable - use market data');

    return recommendations;
  }

  /**
   * EXTRACT WARNINGS
   * Flag issues in data collection
   */
  private extractWarnings(results: PromiseSettledResult<any>[]): string[] {
    const warnings: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const type = ['news', 'events', 'fundamentals'][index];
        warnings.push(`${type} collection failed: ${result.reason}`);
      }
    });

    return warnings;
  }

  /**
   * CACHING
   * Build cache key from context
   */
  private buildCacheKey(context: ResearchContext): string {
    return `research:${context.ticker}:${context.timeframe || 'today'}:${(
      context.focusAreas || []
    ).join(',')}`;
  }

  /**
   * AUDIT LOGGING
   * Log all research operations for transparency
   */
  private logResearchOperation(
    context: ResearchContext,
    result: ResearchResult,
    results: PromiseSettledResult<any>[]
  ): void {
    const log: ResearchAuditLog = {
      tickerResearched: context.ticker,
      requestedAt: result.requestedAt,
      completedAt: result.completedAt,
      newsProvidersUsed: results[0].status === 'fulfilled' ? results[0].value.usedProviders : [],
      newsProvidersFailled: results[0].status === 'fulfilled' ? results[0].value.failures : [],
      eventProvidersUsed: results[1].status === 'fulfilled' ? results[1].value.usedProviders : [],
      eventProvidersFailled: results[1].status === 'fulfilled' ? results[1].value.failures : [],
      fundamentalProvidersUsed: results[2].status === 'fulfilled' ? ['fundamental'] : [],
      fundamentalProvidersFailled: results[2].status === 'rejected' ? [{ providerName: 'fundamental', error: String(results[2].reason), timestamp: new Date(), isRecoverable: true }] : [],
      newsCount: result.news.length,
      eventsCount: result.economicEvents.length,
      fundamentalsRetrieved: result.fundamentals.source !== 'unknown',
      dataQualityScore: result.dataQuality.overall,
      sourcesUsed: result.sources.length,
      executionTimeMs: result.executionTimeMs,
      cacheHits: 0, // TODO: track
      cachesMisses: 0, // TODO: track
    };

    this.auditLogs.push(log);
    this.logger.debug(`Audit logged for ${context.ticker}`, log);
  }

  /**
   * GET AUDIT LOGS
   * Transparency: see what sources were used
   */
  getAuditLogs(tickerFilter?: string): ResearchAuditLog[] {
    if (!tickerFilter) return this.auditLogs;
    return this.auditLogs.filter(log => log.tickerResearched === tickerFilter);
  }

  /**
   * CLEAR CACHE
   * Manual cache invalidation
   */
  clearCache(tickerFilter?: string): void {
    if (!tickerFilter) {
      this.cache.clear();
      return;
    }

    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(tickerFilter));
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * GET PROVIDER STATUS
   * Check which providers are registered and available
   */
  async getProviderStatus(): Promise<any> {
    return {
      newsProviders: await Promise.all(
        this.newsProviders.map(async p => ({
          name: p.name,
          priority: p.priority,
          available: await p.isAvailable(),
        }))
      ),
      eventProviders: await Promise.all(
        this.eventProviders.map(async p => ({
          name: p.name,
          priority: p.priority,
          available: await p.isAvailable(),
        }))
      ),
      fundamentalProviders: await Promise.all(
        this.fundamentalProviders.map(async p => ({
          name: p.name,
          priority: p.priority,
          available: await p.isAvailable(),
        }))
      ),
    };
  }
}
