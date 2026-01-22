import { BaseSource } from './base'
import type { FeedItem, ParsedFundingEvent } from '../types'

export class TechCrunchSource extends BaseSource {
  name = 'techcrunch'
  feedUrl = 'https://techcrunch.com/category/fundraising/feed/'

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
