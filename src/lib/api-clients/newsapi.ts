/**
 * NewsAPI Client
 *
 * Free tier: 500 requests/day
 * Docs: https://newsapi.org/docs
 */

interface NewsAPIArticle {
  source: {
    id: string | null
    name: string
  }
  author: string | null
  title: string
  description: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
  content: string | null
}

interface NewsAPIResponse {
  status: 'ok' | 'error'
  totalResults: number
  articles: NewsAPIArticle[]
  code?: string
  message?: string
}

interface NewsAPISearchOptions {
  q: string
  searchIn?: 'title' | 'description' | 'content'
  sources?: string
  domains?: string
  from?: string
  to?: string
  language?: string
  sortBy?: 'relevancy' | 'popularity' | 'publishedAt'
  pageSize?: number
  page?: number
}

// Simple in-memory cache
const cache = new Map<string, { data: NewsAPIResponse; timestamp: number }>()
const CACHE_TTL = 2 * 60 * 60 * 1000 // 2 hours in milliseconds

export class NewsAPIClient {
  private apiKey: string
  private baseUrl = 'https://newsapi.org/v2'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEWSAPI_KEY || ''
    if (!this.apiKey) {
      console.warn('NewsAPI key not configured')
    }
  }

  private getCacheKey(endpoint: string, params: Record<string, string>): string {
    return `${endpoint}:${JSON.stringify(params)}`
  }

  private getFromCache(key: string): NewsAPIResponse | null {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
    cache.delete(key)
    return null
  }

  private setCache(key: string, data: NewsAPIResponse): void {
    cache.set(key, { data, timestamp: Date.now() })
  }

  async searchEverything(options: NewsAPISearchOptions): Promise<NewsAPIArticle[]> {
    if (!this.apiKey) {
      console.error('NewsAPI: API key not configured')
      return []
    }

    const params: Record<string, string> = {
      q: options.q,
      language: options.language || 'en',
      sortBy: options.sortBy || 'publishedAt',
      pageSize: String(options.pageSize || 100),
    }

    if (options.searchIn) params.searchIn = options.searchIn
    if (options.sources) params.sources = options.sources
    if (options.domains) params.domains = options.domains
    if (options.from) params.from = options.from
    if (options.to) params.to = options.to
    if (options.page) params.page = String(options.page)

    const cacheKey = this.getCacheKey('everything', params)
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      console.log('NewsAPI: Returning cached results')
      return cached.articles
    }

    const queryString = new URLSearchParams(params).toString()
    const url = `${this.baseUrl}/everything?${queryString}`

    try {
      const response = await fetch(url, {
        headers: {
          'X-Api-Key': this.apiKey,
        },
      })

      const data: NewsAPIResponse = await response.json()

      if (data.status === 'error') {
        console.error(`NewsAPI error: ${data.code} - ${data.message}`)
        return []
      }

      this.setCache(cacheKey, data)
      console.log(`NewsAPI: Found ${data.totalResults} articles`)
      return data.articles
    } catch (error) {
      console.error('NewsAPI fetch error:', error)
      return []
    }
  }

  async searchFundingNews(): Promise<NewsAPIArticle[]> {
    // Search for startup funding news
    const queries = [
      'startup raises funding',
      'series A funding',
      'seed funding startup',
      'venture capital raises',
    ]

    // Only search the most relevant query to conserve API calls
    const primaryQuery = '(startup OR company) AND (raises OR secures OR funding OR series)'

    // Get articles from the last 7 days (free tier limitation: max 1 month old)
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 7)

    return this.searchEverything({
      q: primaryQuery,
      domains: 'techcrunch.com,venturebeat.com,crunchbase.com,reuters.com,bloomberg.com',
      from: fromDate.toISOString().split('T')[0],
      sortBy: 'publishedAt',
      pageSize: 100,
    })
  }
}

export const newsApiClient = new NewsAPIClient()
