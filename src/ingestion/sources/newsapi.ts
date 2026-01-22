import { BaseSource } from './base'
import { NewsAPIClient } from '@/lib/api-clients/newsapi'
import type { FeedItem, ParsedFundingEvent } from '../types'

/**
 * NewsAPI Source for startup funding news
 *
 * Uses NewsAPI to fetch funding news articles and converts them
 * to the standard FeedItem format for processing.
 */
export class NewsAPISource extends BaseSource {
  name = 'newsapi'
  feedUrl = '' // Not used - we use the API client instead

  private client: NewsAPIClient

  constructor() {
    super()
    this.client = new NewsAPIClient()
  }

  /**
   * Override fetchFeed to use NewsAPI REST endpoint instead of RSS
   */
  async fetchFeed(): Promise<FeedItem[]> {
    try {
      const articles = await this.client.searchFundingNews()

      // Convert NewsAPI articles to FeedItem format
      return articles.map((article) => ({
        title: article.title,
        link: article.url,
        pubDate: article.publishedAt,
        content: article.content || undefined,
        contentSnippet: article.description || undefined,
        creator: article.author || article.source.name,
        categories: [], // NewsAPI doesn't provide categories
      }))
    } catch (error) {
      console.error('NewsAPI fetch error:', error)
      return []
    }
  }

  /**
   * Parse a NewsAPI article into a funding event
   */
  parseItem(item: FeedItem): ParsedFundingEvent | null {
    if (!item.title || !item.link) {
      return null
    }

    const fullText = `${item.title} ${item.contentSnippet || ''} ${item.content || ''}`

    // Skip if not funding-related
    if (!this.isFundingRelated(fullText)) {
      return null
    }

    const companyName = this.extractCompanyName(item.title)
    if (!companyName || companyName.length < 2) {
      return null
    }

    const roundType = this.extractRoundType(fullText)
    const amountCents = this.extractAmount(fullText)
    const investors = this.extractInvestors(fullText)
    const location = this.extractLocation(fullText)
    const tags = this.extractTags(fullText)

    // Create summary from description or content
    let summary = item.contentSnippet || item.content || ''
    if (summary.length > 500) {
      summary = summary.slice(0, 497) + '...'
    }

    return {
      companyName,
      roundType,
      amountCents,
      announcedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      investors,
      summary: summary || undefined,
      sourceUrl: item.link,
      sourceName: this.name,
      ...location,
      tags,
    }
  }
}
