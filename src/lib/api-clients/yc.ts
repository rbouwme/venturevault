/**
 * Y Combinator API Client
 *
 * Uses the free YC OSS API (https://github.com/yc-oss/api)
 * - 5,615+ companies
 * - 59 industries
 * - Daily updates
 * - No rate limits, no authentication required
 */

export interface YCCompany {
  id: number
  name: string
  slug: string
  website: string
  all_locations: string
  long_description: string
  one_liner: string
  team_size: number
  highlight_black: boolean
  highlight_latinx: boolean
  highlight_women: boolean
  industry: string
  subindustry: string
  launched_at: number
  tags: string[]
  tags_highlighted: string[]
  top_company: boolean
  isHiring: boolean
  nonprofit: boolean
  batch: string
  status: string
  industries: string[]
  regions: string[]
  stage: string
  app_video_public: boolean
  demo_day_video_public: boolean
  app_answers: unknown | null
  question_answers: boolean
  url: string
  api: string
}

export interface YCMeta {
  industries: string[]
  regions: string[]
  tags: string[]
  batches: string[]
  total_companies: number
  last_updated: string
}

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export class YCClient {
  private baseUrl = 'https://yc-oss.github.io/api'

  private getCacheKey(endpoint: string): string {
    return endpoint
  }

  private getFromCache<T>(key: string): T | null {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as T
    }
    cache.delete(key)
    return null
  }

  private setCache<T>(key: string, data: T): void {
    cache.set(key, { data, timestamp: Date.now() })
  }

  /**
   * Fetch all YC companies
   */
  async getAllCompanies(): Promise<YCCompany[]> {
    const cacheKey = this.getCacheKey('companies/all')
    const cached = this.getFromCache<YCCompany[]>(cacheKey)
    if (cached) {
      console.log('YC API: Returning cached companies')
      return cached
    }

    try {
      const response = await fetch(`${this.baseUrl}/companies/all.json`)
      if (!response.ok) {
        console.error(`YC API error: ${response.status}`)
        return []
      }

      const companies: YCCompany[] = await response.json()
      this.setCache(cacheKey, companies)
      console.log(`YC API: Fetched ${companies.length} companies`)
      return companies
    } catch (error) {
      console.error('YC API fetch error:', error)
      return []
    }
  }

  /**
   * Fetch metadata (industries, batches, tags)
   */
  async getMeta(): Promise<YCMeta | null> {
    const cacheKey = this.getCacheKey('meta')
    const cached = this.getFromCache<YCMeta>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      const response = await fetch(`${this.baseUrl}/meta.json`)
      if (!response.ok) {
        console.error(`YC API meta error: ${response.status}`)
        return null
      }

      const meta: YCMeta = await response.json()
      this.setCache(cacheKey, meta)
      return meta
    } catch (error) {
      console.error('YC API meta fetch error:', error)
      return null
    }
  }

  /**
   * Get companies filtered by industry
   */
  async getCompaniesByIndustry(industry: string): Promise<YCCompany[]> {
    const companies = await this.getAllCompanies()
    return companies.filter(
      (c) =>
        c.industry?.toLowerCase() === industry.toLowerCase() ||
        c.industries?.some((i) => i.toLowerCase() === industry.toLowerCase())
    )
  }

  /**
   * Get companies filtered by batch
   */
  async getCompaniesByBatch(batch: string): Promise<YCCompany[]> {
    const companies = await this.getAllCompanies()
    return companies.filter((c) => c.batch === batch)
  }

  /**
   * Get companies that are currently hiring
   */
  async getHiringCompanies(): Promise<YCCompany[]> {
    const companies = await this.getAllCompanies()
    return companies.filter((c) => c.isHiring)
  }

  /**
   * Search companies by name or description
   */
  async searchCompanies(query: string): Promise<YCCompany[]> {
    const companies = await this.getAllCompanies()
    const lowerQuery = query.toLowerCase()
    return companies.filter(
      (c) =>
        c.name?.toLowerCase().includes(lowerQuery) ||
        c.one_liner?.toLowerCase().includes(lowerQuery) ||
        c.long_description?.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Get top/featured companies
   */
  async getTopCompanies(): Promise<YCCompany[]> {
    const companies = await this.getAllCompanies()
    return companies.filter((c) => c.top_company)
  }

  /**
   * Get all available industries
   */
  async getIndustries(): Promise<string[]> {
    const meta = await this.getMeta()
    return meta?.industries || []
  }

  /**
   * Get all available batches
   */
  async getBatches(): Promise<string[]> {
    const meta = await this.getMeta()
    return meta?.batches || []
  }
}

export const ycClient = new YCClient()
