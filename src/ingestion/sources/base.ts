import Parser from 'rss-parser'
import type { FeedItem, ParsedFundingEvent, IngestionResult } from '../types'
import type { RoundType } from '@prisma/client'

export abstract class BaseSource {
  protected parser: Parser

  abstract name: string
  abstract feedUrl: string

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['content:encoded', 'dc:creator'],
      },
    })
  }

  async fetchFeed(): Promise<FeedItem[]> {
    try {
      const feed = await this.parser.parseURL(this.feedUrl)
      return feed.items as FeedItem[]
    } catch (error) {
      console.error(`Error fetching feed from ${this.name}:`, error)
      return []
    }
  }

  abstract parseItem(item: FeedItem): ParsedFundingEvent | null

  protected extractAmount(text: string): bigint | undefined {
    const patterns = [
      /\$(\d+(?:\.\d+)?)\s*(billion|B)/i,
      /\$(\d+(?:\.\d+)?)\s*(million|M)/i,
      /\$(\d+(?:,\d{3})*(?:\.\d+)?)/,
      /raises?\s+\$(\d+(?:\.\d+)?)\s*(billion|B)/i,
      /raises?\s+\$(\d+(?:\.\d+)?)\s*(million|M)/i,
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        let amount = parseFloat(match[1].replace(/,/g, ''))
        const unit = match[2]?.toLowerCase()

        if (unit === 'billion' || unit === 'b') {
          amount *= 1_000_000_000
        } else if (unit === 'million' || unit === 'm') {
          amount *= 1_000_000
        }

        return BigInt(Math.round(amount * 100))
      }
    }

    return undefined
  }

  protected extractRoundType(text: string): RoundType {
    const lowerText = text.toLowerCase()

    if (/pre-?seed/i.test(lowerText)) return 'PRE_SEED'
    if (/seed\s+(round|funding|stage)/i.test(lowerText) || /\bseed\b/i.test(lowerText)) return 'SEED'
    if (/series\s+a\b/i.test(lowerText)) return 'SERIES_A'
    if (/series\s+b\b/i.test(lowerText)) return 'SERIES_B'
    if (/series\s+c\b/i.test(lowerText)) return 'SERIES_C'
    if (/series\s+d\b/i.test(lowerText)) return 'SERIES_D'
    if (/series\s+e\+?/i.test(lowerText) || /series\s+[f-z]/i.test(lowerText)) return 'SERIES_E_PLUS'
    if (/bridge\s+(round|funding|loan)/i.test(lowerText)) return 'BRIDGE'
    if (/debt|loan|credit\s+facility/i.test(lowerText)) return 'DEBT'
    if (/grant/i.test(lowerText)) return 'GRANT'
    if (/ipo|initial\s+public\s+offering/i.test(lowerText)) return 'IPO'
    if (/acqui|bought|purchase/i.test(lowerText)) return 'ACQUISITION'

    return 'UNKNOWN'
  }

  protected extractInvestors(text: string): string[] {
    const investors: string[] = []

    const leadPatterns = [
      /led\s+by\s+([^,\.]+)/i,
      /(?:with|from)\s+([^,\.]+)\s+leading/i,
    ]

    for (const pattern of leadPatterns) {
      const match = text.match(pattern)
      if (match) {
        investors.push(match[1].trim())
      }
    }

    const participantPatterns = [
      /(?:participated|joined)\s+by\s+([^\.]+)/i,
      /(?:with participation from|other investors include)\s+([^\.]+)/i,
    ]

    for (const pattern of participantPatterns) {
      const match = text.match(pattern)
      if (match) {
        const names = match[1].split(/,\s*(?:and\s+)?/)
        names.forEach((name) => {
          const cleaned = name.trim().replace(/^and\s+/i, '')
          if (cleaned && !investors.includes(cleaned)) {
            investors.push(cleaned)
          }
        })
      }
    }

    return investors.slice(0, 10)
  }

  protected extractCompanyName(title: string): string {
    const patterns = [
      /^([A-Z][a-zA-Z0-9\s&\-\.]+?)(?:\s+raises|\s+secures|\s+lands|\s+closes|\s+gets|\s+nabs|\s+grabs|\s+snags)/i,
      /^([A-Z][a-zA-Z0-9\s&\-\.]+?)(?:\s+announces|\s+reveals)/i,
    ]

    for (const pattern of patterns) {
      const match = title.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }

    const words = title.split(/\s+/)
    const companyWords: string[] = []

    for (const word of words) {
      if (/^(raises|secures|lands|closes|gets|announces|in|with|for|to)$/i.test(word)) {
        break
      }
      companyWords.push(word)
    }

    return companyWords.join(' ').trim() || title.split(/\s+/).slice(0, 3).join(' ')
  }

  protected isFundingRelated(text: string): boolean {
    const keywords = [
      'raises', 'secures', 'funding', 'investment', 'series',
      'seed', 'round', 'capital', 'venture', 'backed',
      'closes', 'million', 'billion', 'valuation',
    ]

    const lowerText = text.toLowerCase()
    return keywords.some((keyword) => lowerText.includes(keyword))
  }

  protected extractLocation(text: string): { country?: string; state?: string; city?: string } {
    const usStates: Record<string, string> = {
      'california': 'CA', 'new york': 'NY', 'texas': 'TX', 'florida': 'FL',
      'massachusetts': 'MA', 'washington': 'WA', 'colorado': 'CO', 'illinois': 'IL',
      'san francisco': 'CA', 'sf': 'CA', 'nyc': 'NY', 'los angeles': 'CA',
      'boston': 'MA', 'seattle': 'WA', 'austin': 'TX', 'denver': 'CO',
      'chicago': 'IL', 'miami': 'FL', 'silicon valley': 'CA',
    }

    const lowerText = text.toLowerCase()

    for (const [location, state] of Object.entries(usStates)) {
      if (lowerText.includes(location)) {
        return {
          country: 'US',
          state,
          city: location.charAt(0).toUpperCase() + location.slice(1),
        }
      }
    }

    if (/\b(toronto|vancouver|montreal|canada|canadian)\b/i.test(text)) {
      return { country: 'CA' }
    }

    return {}
  }

  protected extractTags(text: string): string[] {
    const industries: Record<string, string> = {
      'fintech|financial technology|payments|banking': 'Fintech',
      'healthtech|health tech|healthcare|medical|biotech': 'Healthcare',
      'edtech|education|learning': 'EdTech',
      'artificial intelligence|machine learning|ai|ml': 'AI/ML',
      'saas|software as a service|b2b software': 'SaaS',
      'e-?commerce|retail|shopping': 'E-commerce',
      'cybersecurity|security|infosec': 'Cybersecurity',
      'climate|cleantech|green|sustainability': 'Climate Tech',
      'crypto|blockchain|web3|defi': 'Crypto/Web3',
      'logistics|supply chain|shipping': 'Logistics',
      'real estate|proptech|property': 'Real Estate',
      'gaming|games|esports': 'Gaming',
      'food|restaurant|delivery': 'Food & Beverage',
      'travel|hospitality|tourism': 'Travel',
      'hr|human resources|recruiting|hiring': 'HR Tech',
    }

    const tags: string[] = []
    const lowerText = text.toLowerCase()

    for (const [pattern, tag] of Object.entries(industries)) {
      if (new RegExp(pattern, 'i').test(lowerText) && !tags.includes(tag)) {
        tags.push(tag)
      }
    }

    return tags.slice(0, 5)
  }
}
