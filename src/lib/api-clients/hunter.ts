/**
 * Hunter.io API Client
 *
 * Free tier: 25 searches/month
 * Docs: https://hunter.io/api-documentation/v2
 *
 * Credits usage:
 * - Domain search: 1 credit per result
 * - Email finder: 1 credit
 * - Email verifier: 1 credit
 */

export interface HunterEmail {
  value: string
  type: 'personal' | 'generic'
  confidence: number // 0-100
  first_name: string
  last_name: string
  position: string
  seniority: string
  department: string
  linkedin: string | null
  twitter: string | null
  phone_number: string | null
  verification: {
    date: string
    status: 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown'
  }
}

export interface HunterDomainSearchResponse {
  data: {
    domain: string
    disposable: boolean
    webmail: boolean
    accept_all: boolean
    pattern: string
    organization: string
    emails: HunterEmail[]
  }
  meta: {
    results: number
    limit: number
    offset: number
    params: {
      domain: string
      company: string | null
      type: string | null
      seniority: string | null
      department: string | null
    }
  }
}

export interface HunterSearchOptions {
  domain?: string
  company?: string
  type?: 'personal' | 'generic'
  seniority?: 'junior' | 'senior' | 'executive'
  department?: string
  limit?: number
  offset?: number
}

export class HunterClient {
  private apiKey: string
  private baseUrl = 'https://api.hunter.io/v2'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUNTER_API_KEY || ''
    if (!this.apiKey) {
      console.warn('Hunter.io API key not configured')
    }
  }

  get isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Search for emails at a domain
   */
  async domainSearch(domain: string, options: HunterSearchOptions = {}): Promise<HunterEmail[]> {
    if (!this.apiKey) {
      console.log('[Hunter] API key not configured, skipping')
      return []
    }

    const params = new URLSearchParams({
      api_key: this.apiKey,
      domain,
      limit: (options.limit || 10).toString(),
    })

    if (options.type) params.set('type', options.type)
    if (options.seniority) params.set('seniority', options.seniority)
    if (options.department) params.set('department', options.department)
    if (options.offset) params.set('offset', options.offset.toString())

    try {
      const response = await fetch(`${this.baseUrl}/domain-search?${params.toString()}`)

      if (!response.ok) {
        const error = await response.text()
        console.error(`[Hunter] API error: ${response.status} - ${error}`)
        return []
      }

      const data: HunterDomainSearchResponse = await response.json()
      console.log(`[Hunter] Found ${data.data.emails?.length || 0} emails for ${domain}`)

      return data.data.emails || []
    } catch (error) {
      console.error('[Hunter] Fetch error:', error)
      return []
    }
  }

  /**
   * Find email for a specific person
   */
  async findEmail(
    domain: string,
    firstName: string,
    lastName: string
  ): Promise<HunterEmail | null> {
    if (!this.apiKey) {
      console.log('[Hunter] API key not configured, skipping')
      return null
    }

    const params = new URLSearchParams({
      api_key: this.apiKey,
      domain,
      first_name: firstName,
      last_name: lastName,
    })

    try {
      const response = await fetch(`${this.baseUrl}/email-finder?${params.toString()}`)

      if (!response.ok) {
        const error = await response.text()
        console.error(`[Hunter] API error: ${response.status} - ${error}`)
        return null
      }

      const data = await response.json()
      return data.data || null
    } catch (error) {
      console.error('[Hunter] Fetch error:', error)
      return null
    }
  }

  /**
   * Verify an email address
   */
  async verifyEmail(email: string): Promise<{
    status: string
    result: string
    score: number
  } | null> {
    if (!this.apiKey) {
      console.log('[Hunter] API key not configured, skipping')
      return null
    }

    const params = new URLSearchParams({
      api_key: this.apiKey,
      email,
    })

    try {
      const response = await fetch(`${this.baseUrl}/email-verifier?${params.toString()}`)

      if (!response.ok) {
        const error = await response.text()
        console.error(`[Hunter] API error: ${response.status} - ${error}`)
        return null
      }

      const data = await response.json()
      return data.data || null
    } catch (error) {
      console.error('[Hunter] Fetch error:', error)
      return null
    }
  }

  /**
   * Convert Hunter seniority to our standard format
   */
  static normalizeSeniority(hunterSeniority: string): string {
    const mapping: Record<string, string> = {
      junior: 'entry',
      senior: 'senior',
      executive: 'c_level',
    }
    return mapping[hunterSeniority.toLowerCase()] || 'unknown'
  }

  /**
   * Convert Hunter department to our standard format
   */
  static normalizeDepartment(hunterDept: string): string {
    const mapping: Record<string, string> = {
      engineering: 'engineering',
      finance: 'finance',
      hr: 'hr',
      it: 'it',
      legal: 'legal',
      marketing: 'marketing',
      operations: 'operations',
      sales: 'sales',
      support: 'support',
      communication: 'marketing',
    }
    return mapping[hunterDept.toLowerCase()] || hunterDept.toLowerCase()
  }
}

export const hunterClient = new HunterClient()
