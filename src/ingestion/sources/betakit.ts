import { BaseSource } from './base'
import type { FeedItem, ParsedFundingEvent } from '../types'

export class BetaKitSource extends BaseSource {
  name = 'betakit'
  feedUrl = 'https://betakit.com/feed/'

  // BetaKit mixes editorial and funding articles — require a dollar amount or explicit raise/close language
  protected isFundingRelated(text: string): boolean {
    const hasMoney = /\$\d/.test(text)
    const hasFundingVerb = /\b(raises?|raised|secures?|secured|closes?|closed|lands?|landed|nabs?|nabbed|gets?|funding round|series [a-z]|seed round|pre-seed)\b/i.test(text)
    return hasMoney || hasFundingVerb
  }

  parseItem(item: FeedItem): ParsedFundingEvent | null {
    const title = item.title || ''
    const content = item.contentSnippet || item.content || ''
    const fullText = `${title} ${content}`

    if (!this.isFundingRelated(fullText)) {
      return null
    }

    const companyName = this.extractCompanyName(title)
    const roundType = this.extractRoundType(fullText)
    const amountCents = this.extractAmount(fullText)
    const investors = this.extractInvestors(fullText)
    const tags = this.extractTags(fullText)

    // BetaKit is Canada-focused — default to CA if no specific location found
    const location = this.extractLocation(fullText)
    if (!location.country) {
      location.country = 'CA'
    }

    if (!companyName || companyName.length < 2) {
      return null
    }

    return {
      companyName,
      roundType,
      amountCents,
      announcedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      investors,
      summary: content.slice(0, 500),
      sourceUrl: item.link || '',
      sourceName: this.name,
      ...location,
      tags,
    }
  }
}
