/**
 * Snov.io API Client
 *
 * Free tier: 50 credits/month
 * Docs: https://snov.io/api-docs
 *
 * Credits usage:
 * - Domain search: 1 credit per email found
 * - Email finder: 1 credit per email
 * - Email verifier: 1 credit per email
 */

export interface SnovioEmail {
  email: string
  firstName: string
  lastName: string
  position: string
  sourcePage: string
  companyName: string
  locality: string | null
  country: string | null
  last_update_date: string
  status: 'valid' | 'invalid' | 'catch_all' | 'unknown'
}

export interface SnovioDomainSearchResponse {
  success: boolean
  emails: SnovioEmail[]
  domain: string
  webmail: boolean
  result: number
  lastUpdateDate: string
}

export interface SnovioSearchOptions {
  type?: 'personal' | 'generic'
  positions?: string[]
  limit?: number
  lastId?: number
}

export class SnovioClient {
  private clientId: string
  private clientSecret: string
  private baseUrl = 'https://api.snov.io/v1'
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor(clientId?: string, clientSecret?: string) {
    this.clientId = clientId || process.env.SNOVIO_CLIENT_ID || ''
    this.clientSecret = clientSecret || process.env.SNOVIO_CLIENT_SECRET || ''

    if (!this.clientId || !this.clientSecret) {
      console.warn('Snov.io API credentials not configured')
    }
  }

  get isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret)
  }

  /**
   * Get access token (handles automatic refresh)
   */
  private async getAccessToken(): Promise<string | null> {
    if (!this.isConfigured) {
      return null
    }

    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    // Get new token
    try {
      const response = await fetch(`${this.baseUrl}/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      })

      if (!response.ok) {
        console.error('[Snov.io] Failed to get access token')
        return null
      }

      const data = await response.json()
      this.accessToken = data.access_token
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000 // Refresh 1 min before expiry

      return this.accessToken
    } catch (error) {
      console.error('[Snov.io] Token fetch error:', error)
      return null
    }
  }

  /**
   * Find emails for a domain
   */
  async domainSearch(domain: string, options: SnovioSearchOptions = {}): Promise<SnovioEmail[]> {
    if (!this.isConfigured) {
      console.log('[Snov.io] API not configured, skipping')
      return []
    }

    const token = await this.getAccessToken()
    if (!token) {
      console.error('[Snov.io] Failed to get access token')
      return []
    }

    const params = new URLSearchParams({
      domain,
      type: options.type || 'personal',
      limit: (options.limit || 10).toString(),
    })

    if (options.lastId) {
      params.set('lastId', options.lastId.toString())
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/get-domain-emails-with-info?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error(`[Snov.io] API error: ${response.status} - ${error}`)
        return []
      }

      const data: SnovioDomainSearchResponse = await response.json()
      console.log(`[Snov.io] Found ${data.emails?.length || 0} emails for ${domain}`)

      return data.emails || []
    } catch (error) {
      console.error('[Snov.io] Fetch error:', error)
      return []
    }
  }

  /**
   * Find email for a specific person
   */
  async findEmail(
    firstName: string,
    lastName: string,
    domain: string
  ): Promise<SnovioEmail | null> {
    if (!this.isConfigured) {
      console.log('[Snov.io] API not configured, skipping')
      return null
    }

    const token = await this.getAccessToken()
    if (!token) {
      console.error('[Snov.io] Failed to get access token')
      return null
    }

    try {
      const response = await fetch(`${this.baseUrl}/get-emails-from-names`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          domain,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error(`[Snov.io] API error: ${response.status} - ${error}`)
        return null
      }

      const data = await response.json()
      return data.data?.[0] || null
    } catch (error) {
      console.error('[Snov.io] Fetch error:', error)
      return null
    }
  }

  /**
   * Verify email addresses
   */
  async verifyEmails(emails: string[]): Promise<Array<{
    email: string
    status: string
  }>> {
    if (!this.isConfigured) {
      console.log('[Snov.io] API not configured, skipping')
      return []
    }

    const token = await this.getAccessToken()
    if (!token) {
      console.error('[Snov.io] Failed to get access token')
      return []
    }

    try {
      const response = await fetch(`${this.baseUrl}/verify-emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emails }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error(`[Snov.io] API error: ${response.status} - ${error}`)
        return []
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('[Snov.io] Fetch error:', error)
      return []
    }
  }

  /**
   * Convert Snov.io status to our standard format
   */
  static normalizeEmailStatus(snovioStatus: string): string {
    const mapping: Record<string, string> = {
      valid: 'VERIFIED',
      invalid: 'INVALID',
      catch_all: 'UNVERIFIED',
      unknown: 'UNKNOWN',
    }
    return mapping[snovioStatus.toLowerCase()] || 'UNKNOWN'
  }
}

export const snovioClient = new SnovioClient()
