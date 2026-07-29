import type { RoundType } from '@/types/enums'

export interface FeedItem {
  title?: string
  link?: string
  pubDate?: string
  content?: string
  contentSnippet?: string
  creator?: string
  categories?: string[]
}

export interface ParsedFundingEvent {
  companyName: string
  domain?: string
  roundType: RoundType
  amountCents?: bigint
  announcedAt: Date
  investors: string[]
  summary?: string
  sourceUrl: string
  sourceName: string
  country?: string
  state?: string
  city?: string
  tags: string[]
}

export interface IngestionResult {
  source: string
  itemsProcessed: number
  itemsCreated: number
  itemsSkipped: number
  errors: string[]
}

export interface SourceConfig {
  name: string
  feedUrl: string
  enabled: boolean
}
