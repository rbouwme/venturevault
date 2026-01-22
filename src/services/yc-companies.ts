import { prisma } from '@/lib/prisma'
import { ycClient, type YCCompany } from '@/lib/api-clients/yc'

export interface YCSyncResult {
  success: boolean
  companiesProcessed: number
  companiesCreated: number
  companiesUpdated: number
  errors: string[]
}

/**
 * Extract domain from website URL
 */
function extractDomain(website: string | null): string | null {
  if (!website) return null
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`)
    return url.hostname.replace('www.', '')
  } catch {
    return null
  }
}

/**
 * Parse location string into country/state/city
 */
function parseLocation(location: string | null): {
  country?: string
  state?: string
  city?: string
} {
  if (!location) return {}

  // Common US locations
  const usStates: Record<string, string> = {
    'california': 'CA', 'ca': 'CA',
    'new york': 'NY', 'ny': 'NY',
    'texas': 'TX', 'tx': 'TX',
    'massachusetts': 'MA', 'ma': 'MA',
    'washington': 'WA', 'wa': 'WA',
    'colorado': 'CO', 'co': 'CO',
    'florida': 'FL', 'fl': 'FL',
    'illinois': 'IL', 'il': 'IL',
  }

  const usCities: Record<string, { state: string; city: string }> = {
    'san francisco': { state: 'CA', city: 'San Francisco' },
    'sf': { state: 'CA', city: 'San Francisco' },
    'new york city': { state: 'NY', city: 'New York' },
    'nyc': { state: 'NY', city: 'New York' },
    'los angeles': { state: 'CA', city: 'Los Angeles' },
    'la': { state: 'CA', city: 'Los Angeles' },
    'seattle': { state: 'WA', city: 'Seattle' },
    'boston': { state: 'MA', city: 'Boston' },
    'austin': { state: 'TX', city: 'Austin' },
    'denver': { state: 'CO', city: 'Denver' },
    'chicago': { state: 'IL', city: 'Chicago' },
    'miami': { state: 'FL', city: 'Miami' },
  }

  const lowerLocation = location.toLowerCase()

  // Check for known cities first
  for (const [cityKey, cityData] of Object.entries(usCities)) {
    if (lowerLocation.includes(cityKey)) {
      return {
        country: 'US',
        state: cityData.state,
        city: cityData.city,
      }
    }
  }

  // Check for US states
  for (const [stateKey, stateCode] of Object.entries(usStates)) {
    if (lowerLocation.includes(stateKey)) {
      return {
        country: 'US',
        state: stateCode,
      }
    }
  }

  // Check for other countries
  if (lowerLocation.includes('canada') || lowerLocation.includes('toronto') || lowerLocation.includes('vancouver')) {
    return { country: 'CA' }
  }
  if (lowerLocation.includes('uk') || lowerLocation.includes('london') || lowerLocation.includes('united kingdom')) {
    return { country: 'GB' }
  }
  if (lowerLocation.includes('india') || lowerLocation.includes('bangalore') || lowerLocation.includes('mumbai')) {
    return { country: 'IN' }
  }

  return {}
}

/**
 * Convert YC company to database format
 */
function mapYCCompanyToData(yc: YCCompany) {
  const location = parseLocation(yc.all_locations)
  const domain = extractDomain(yc.website)

  return {
    name: yc.name,
    domain,
    description: yc.long_description || null,
    oneLiner: yc.one_liner || null,
    country: location.country || null,
    state: location.state || null,
    city: location.city || null,
    headcount: yc.team_size || null,
    tags: JSON.stringify(yc.industries || []),
    ycBatch: yc.batch || null,
    ycUrl: yc.url || null,
    ycId: yc.id,
    dataSource: 'YC',
    isHiring: yc.isHiring || false,
    lastSyncedAt: new Date(),
    careersUrl: yc.website ? `${yc.website}/careers` : null,
  }
}

/**
 * Sync all YC companies to database
 */
export async function syncYCCompanies(): Promise<YCSyncResult> {
  const result: YCSyncResult = {
    success: false,
    companiesProcessed: 0,
    companiesCreated: 0,
    companiesUpdated: 0,
    errors: [],
  }

  try {
    console.log('Starting YC companies sync...')
    const companies = await ycClient.getAllCompanies()

    if (companies.length === 0) {
      result.errors.push('No companies returned from YC API')
      return result
    }

    console.log(`Fetched ${companies.length} companies from YC API`)

    for (const ycCompany of companies) {
      result.companiesProcessed++

      try {
        const data = mapYCCompanyToData(ycCompany)

        // Check if company already exists by YC ID
        const existing = await prisma.company.findFirst({
          where: { ycId: ycCompany.id },
        })

        if (existing) {
          // Update existing company
          await prisma.company.update({
            where: { id: existing.id },
            data,
          })
          result.companiesUpdated++
        } else {
          // Check if company exists by name (case-insensitive)
          const existingByName = await prisma.company.findFirst({
            where: {
              name: { equals: ycCompany.name, mode: 'insensitive' },
              dataSource: { not: 'YC' },
            },
          })

          if (existingByName) {
            // Update existing company with YC data
            await prisma.company.update({
              where: { id: existingByName.id },
              data: {
                ...data,
                // Preserve some existing fields if they have more data
                description: existingByName.description || data.description,
                linkedinUrl: existingByName.linkedinUrl,
                logoUrl: existingByName.logoUrl,
              },
            })
            result.companiesUpdated++
          } else {
            // Create new company
            await prisma.company.create({ data })
            result.companiesCreated++
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Error processing ${ycCompany.name}: ${message}`)
      }

      // Log progress every 500 companies
      if (result.companiesProcessed % 500 === 0) {
        console.log(`Processed ${result.companiesProcessed} companies...`)
      }
    }

    result.success = true
    console.log(`YC sync complete: ${result.companiesCreated} created, ${result.companiesUpdated} updated`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(`Sync failed: ${message}`)
    console.error('YC sync failed:', error)
  }

  return result
}

/**
 * Get companies by industry from database
 */
export async function getCompaniesByIndustry(
  industry: string,
  options?: {
    limit?: number
    offset?: number
    hiringOnly?: boolean
    ycOnly?: boolean
  }
) {
  const where: Record<string, unknown> = {
    archivedAt: null,
  }

  // Filter by industry (stored in tags JSON)
  if (industry && industry !== 'all') {
    where.tags = { contains: industry }
  }

  if (options?.hiringOnly) {
    where.isHiring = true
  }

  if (options?.ycOnly) {
    where.dataSource = 'YC'
  }

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      include: {
        fundingEvents: {
          orderBy: { announcedAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { jobPostings: true, people: true },
        },
      },
      orderBy: [
        { isHiring: 'desc' },
        { lastSyncedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: options?.limit || 20,
      skip: options?.offset || 0,
    }),
    prisma.company.count({ where }),
  ])

  return { companies, total }
}

/**
 * Get YC sync status
 */
export async function getYCSyncStatus() {
  const totalYC = await prisma.company.count({
    where: { dataSource: 'YC' },
  })

  const lastSynced = await prisma.company.findFirst({
    where: { dataSource: 'YC' },
    orderBy: { lastSyncedAt: 'desc' },
    select: { lastSyncedAt: true },
  })

  return {
    totalCompanies: totalYC,
    lastSyncedAt: lastSynced?.lastSyncedAt || null,
  }
}

/**
 * Get available industries from YC companies
 */
export async function getAvailableIndustries(): Promise<{ industry: string; count: number }[]> {
  const companies = await prisma.company.findMany({
    where: {
      dataSource: 'YC',
      tags: { not: null },
    },
    select: { tags: true },
  })

  const industryCounts: Record<string, number> = {}

  for (const company of companies) {
    if (company.tags) {
      try {
        const industries = JSON.parse(company.tags) as string[]
        for (const industry of industries) {
          industryCounts[industry] = (industryCounts[industry] || 0) + 1
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  return Object.entries(industryCounts)
    .map(([industry, count]) => ({ industry, count }))
    .sort((a, b) => b.count - a.count)
}
