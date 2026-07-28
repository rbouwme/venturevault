import { BaseSource } from './base'
import type { FeedItem, ParsedFundingEvent } from '../types'

export class FinancialPostSource extends BaseSource {
  name = 'financialpost'
  feedUrl = 'https://financialpost.com/feed/'

  protected isFundingRelated(text: string): boolean {
    const hasMoney = /\$\d/.test(text)
    const hasFundingVerb = /\b(raises?|raised|secures?|secured|closes?|closed|lands?|landed|nabs?|nabbed|funding round|series [a-z]|seed round|pre-seed|venture capital|vc-backed)\b/i.test(text)
    return hasMoney && hasFundingVerb
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
    const location = this.extractLocation(fullText)
    const tags = this.extractTags(fullText)

    // Financial Post is Canada-focused — default to CA if no location found
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
