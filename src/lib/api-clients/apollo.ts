/**
 * Apollo.io API Client
 *
 * Free tier: 50 credits/month
 * Docs: https://apolloio.github.io/apollo-api-docs/
 *
 * Credits usage:
 * - People search: 1 credit per person returned
 * - Email reveal: 1 credit per email
 */

export interface ApolloPerson {
  id: string
  first_name: string
  last_name: string
  name: string
  title: string
  headline: string
  linkedin_url: string
  email: string | null
  email_status: 'verified' | 'unverified' | 'invalid' | null
  organization_name: string
  departments: string[]
  seniority: string
  photo_url: string | null
}

export interface ApolloSearchResponse {
  people: ApolloPerson[]
  pagination: {
    page: number
    per_page: number
    total_entries: number
    total_pages: number
  }
}

export interface ApolloSearchOptions {
  organizationDomains?: string[]
  organizationNames?: string[]
  titles?: string[]
  seniorities?: string[]
  departments?: string[]
  perPage?: number
  page?: number
}

// Seniority levels supported by Apollo
export const APOLLO_SENIORITIES = [
  'owner',
  'founder',
  'c_suite',
  'partner',
  'vp',
  'head',
  'director',
  'manager',
  'senior',
  'entry',
  'intern',
] as const

// Departments supported by Apollo
export const APOLLO_DEPARTMENTS = [
  'engineering',
  'finance',
  'human_resources',
  'information_technology',
  'legal',
  'marketing',
  'operations',
  'sales',
  'support',
  'master_data',
] as const

export class ApolloClient {
  private apiKey: string
  private baseUrl = 'https://api.apollo.io/v1'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.APOLLO_API_KEY || ''
    if (!this.apiKey) {
      console.warn('Apollo API key not configured')
    }
  }

  get isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Search for people at a company
   */
  async searchPeople(options: ApolloSearchOptions): Promise<ApolloPerson[]> {
    if (!this.apiKey) {
      console.error('Apollo: API key not configured')
      return []
    }

    const body: Record<string, unknown> = {
      per_page: options.perPage || 10,
      page: options.page || 1,
    }

    if (options.organizationDomains?.length) {
      body.organization_domains = options.organizationDomains
    }
    if (options.organizationNames?.length) {
      body.organization_names = options.organizationNames
    }
    if (options.titles?.length) {
      body.person_titles = options.titles
    }
    if (options.seniorities?.length) {
      body.person_seniorities = options.seniorities
    }
    if (options.departments?.length) {
      body.person_departments = options.departments
    }

    try {
      const response = await fetch(`${this.baseUrl}/mixed_people/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error(`Apollo API error: ${response.status} - ${error}`)
        return []
      }

      const data: ApolloSearchResponse = await response.json()
      console.log(`Apollo: Found ${data.people?.length || 0} people`)
      return data.people || []
    } catch (error) {
      console.error('Apollo fetch error:', error)
      return []
    }
  }

  /**
   * Search for key contacts at a company (founders, executives, hiring managers)
   */
  async findKeyContacts(
    domain: string,
    options?: {
      departments?: string[]
      seniorities?: string[]
      limit?: number
    }
  ): Promise<ApolloPerson[]> {
    // Default to searching for decision makers if no options provided
    const seniorities = options?.seniorities || [
      'founder',
      'c_suite',
      'vp',
      'director',
      'head',
    ]

    const departments = options?.departments || [
      'engineering',
      'human_resources',
      'operations',
    ]

    return this.searchPeople({
      organizationDomains: [domain],
      seniorities,
      departments,
      perPage: options?.limit || 10,
    })
  }

  /**
   * Convert Apollo seniority to our standard format
   */
  static normalizeSeniority(apolloSeniority: string): string {
    const mapping: Record<string, string> = {
      owner: 'founder',
      founder: 'founder',
      c_suite: 'c_level',
      partner: 'c_level',
      vp: 'vp',
      head: 'director',
      director: 'director',
      manager: 'manager',
      senior: 'senior',
      entry: 'entry',
      intern: 'entry',
    }
    return mapping[apolloSeniority] || 'unknown'
  }

  /**
   * Convert Apollo department to our standard format
   */
  static normalizeDepartment(apolloDept: string): string {
    const mapping: Record<string, string> = {
      engineering: 'engineering',
      finance: 'finance',
      human_resources: 'hr',
      information_technology: 'it',
      legal: 'legal',
      marketing: 'marketing',
      operations: 'operations',
      sales: 'sales',
      support: 'support',
      master_data: 'other',
    }
    return mapping[apolloDept] || apolloDept
  }
}

export const apolloClient = new ApolloClient()
