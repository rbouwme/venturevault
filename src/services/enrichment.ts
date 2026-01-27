import { prisma } from '@/lib/prisma'
import { apolloClient, ApolloClient, type ApolloPerson } from '@/lib/api-clients/apollo'
import { hunterClient, HunterClient, type HunterEmail } from '@/lib/api-clients/hunter'
import { snovioClient, SnovioClient, type SnovioEmail } from '@/lib/api-clients/snovio'
import { hasCredits, useCredits, getRemainingCredits, getAvailableServices } from './credits'

export interface EnrichmentOptions {
  departments?: string[]
  seniorities?: string[]
  limit?: number
}

export interface EnrichmentResult {
  success: boolean
  contactsFound: number
  contactsCreated: number
  creditsUsed: number
  error?: string
}

export interface ContactWithCompany {
  id: string
  name: string
  title: string | null
  role: string | null
  department: string | null
  seniority: string | null
  email: string | null
  emailStatus: string
  linkedinUrl: string | null
  confidence: number | null
  source: string
  isVerified: boolean
  company: {
    id: string
    name: string
    domain: string | null
  }
}

/**
 * Enrich company contacts using Apollo.io
 */
export async function enrichCompanyContacts(
  companyId: string,
  options: EnrichmentOptions = {}
): Promise<EnrichmentResult> {
  // Check if Apollo is configured
  if (!apolloClient.isConfigured) {
    return {
      success: false,
      contactsFound: 0,
      contactsCreated: 0,
      creditsUsed: 0,
      error: 'Apollo API key not configured',
    }
  }

  // Get company details
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  })

  if (!company) {
    return {
      success: false,
      contactsFound: 0,
      contactsCreated: 0,
      creditsUsed: 0,
      error: 'Company not found',
    }
  }

  // Need domain to search Apollo
  if (!company.domain) {
    return {
      success: false,
      contactsFound: 0,
      contactsCreated: 0,
      creditsUsed: 0,
      error: 'Company domain not available',
    }
  }

  const limit = options.limit || 10

  // Check if we have enough credits
  if (!(await hasCredits('APOLLO', limit))) {
    const remaining = await getRemainingCredits('APOLLO')
    return {
      success: false,
      contactsFound: 0,
      contactsCreated: 0,
      creditsUsed: 0,
      error: `Insufficient Apollo credits. ${remaining} remaining this month.`,
    }
  }

  // Search for contacts via Apollo
  const people = await apolloClient.findKeyContacts(company.domain, {
    departments: options.departments,
    seniorities: options.seniorities,
    limit,
  })

  if (people.length === 0) {
    return {
      success: true,
      contactsFound: 0,
      contactsCreated: 0,
      creditsUsed: 0,
    }
  }

  // Track credits usage (1 credit per person returned)
  await useCredits('APOLLO', people.length)

  // Create or update contacts in database
  let contactsCreated = 0

  for (const person of people) {
    const existingContact = await prisma.person.findFirst({
      where: {
        companyId,
        OR: [
          { linkedinUrl: person.linkedin_url },
          {
            AND: [
              { name: person.name },
              { email: person.email },
            ],
          },
        ],
      },
    })

    if (existingContact) {
      // Update existing contact with enriched data
      await prisma.person.update({
        where: { id: existingContact.id },
        data: {
          title: person.title || existingContact.title,
          department: person.departments?.[0]
            ? ApolloClient.normalizeDepartment(person.departments[0])
            : existingContact.department,
          seniority: person.seniority
            ? ApolloClient.normalizeSeniority(person.seniority)
            : existingContact.seniority,
          email: person.email || existingContact.email,
          emailStatus: person.email_status?.toUpperCase() || existingContact.emailStatus,
          linkedinUrl: person.linkedin_url || existingContact.linkedinUrl,
          confidence: 0.9, // Apollo data is generally reliable
          enrichedAt: new Date(),
          source: 'APOLLO',
        },
      })
    } else {
      // Create new contact
      await prisma.person.create({
        data: {
          companyId,
          name: person.name,
          role: person.title, // Use title as role for backward compatibility
          title: person.title,
          department: person.departments?.[0]
            ? ApolloClient.normalizeDepartment(person.departments[0])
            : null,
          seniority: person.seniority
            ? ApolloClient.normalizeSeniority(person.seniority)
            : null,
          email: person.email,
          emailStatus: person.email_status?.toUpperCase() || 'UNKNOWN',
          linkedinUrl: person.linkedin_url,
          confidence: 0.9,
          enrichedAt: new Date(),
          source: 'APOLLO',
          isVerified: person.email_status === 'verified',
        },
      })
      contactsCreated++
    }
  }

  return {
    success: true,
    contactsFound: people.length,
    contactsCreated,
    creditsUsed: people.length,
  }
}

/**
 * Get contacts for a company
 */
export async function getCompanyContacts(
  companyId: string,
  options?: {
    department?: string
    seniority?: string
    limit?: number
    offset?: number
  }
): Promise<ContactWithCompany[]> {
  const where: Record<string, unknown> = {
    companyId,
    archivedAt: null,
  }

  if (options?.department) {
    where.department = options.department
  }
  if (options?.seniority) {
    where.seniority = options.seniority
  }

  const contacts = await prisma.person.findMany({
    where,
    include: {
      company: {
        select: {
          id: true,
          name: true,
          domain: true,
        },
      },
    },
    orderBy: [
      { seniority: 'asc' }, // Higher seniority first
      { enrichedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    take: options?.limit || 50,
    skip: options?.offset || 0,
  })

  return contacts.map((c) => ({
    id: c.id,
    name: c.name,
    title: c.title,
    role: c.role,
    department: c.department,
    seniority: c.seniority,
    email: c.email,
    emailStatus: c.emailStatus,
    linkedinUrl: c.linkedinUrl,
    confidence: c.confidence,
    source: c.source,
    isVerified: c.isVerified,
    company: c.company,
  }))
}

/**
 * Get contact count for a company
 */
export async function getCompanyContactCount(companyId: string): Promise<number> {
  return prisma.person.count({
    where: {
      companyId,
      archivedAt: null,
    },
  })
}

/**
 * Enrich using Hunter.io
 */
async function enrichWithHunter(
  companyId: string,
  options: EnrichmentOptions = {}
): Promise<EnrichmentResult> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  })

  if (!company || !company.domain) {
    return {
      success: false,
      contactsFound: 0,
      contactsCreated: 0,
      creditsUsed: 0,
      error: 'Company domain not available',
    }
  }

  const limit = options.limit || 10

  // Search for emails
  const emails = await hunterClient.domainSearch(company.domain, {
    type: 'personal',
    limit,
  })

  if (emails.length === 0) {
    return {
      success: true,
      contactsFound: 0,
      contactsCreated: 0,
      creditsUsed: 0,
    }
  }

  // Track credits
  await useCredits('HUNTER', emails.length)

  // Create contacts
  let contactsCreated = 0

  for (const email of emails) {
    const existing = await prisma.person.findFirst({
      where: {
        companyId,
        OR: [
          { email: email.value },
          { name: `${email.first_name} ${email.last_name}` },
        ],
      },
    })

    if (existing) {
      await prisma.person.update({
        where: { id: existing.id },
        data: {
          email: email.value || existing.email,
          emailStatus: email.verification?.status?.toUpperCase() || 'UNKNOWN',
          linkedinUrl: email.linkedin || existing.linkedinUrl,
          title: email.position || existing.title,
          department: email.department
            ? HunterClient.normalizeDepartment(email.department)
            : existing.department,
          seniority: email.seniority
            ? HunterClient.normalizeSeniority(email.seniority)
            : existing.seniority,
          confidence: email.confidence / 100,
          enrichedAt: new Date(),
          source: 'HUNTER',
        },
      })
    } else {
      await prisma.person.create({
        data: {
          companyId,
          name: `${email.first_name} ${email.last_name}`,
          email: email.value,
          emailStatus: email.verification?.status?.toUpperCase() || 'UNKNOWN',
          linkedinUrl: email.linkedin,
          title: email.position,
          role: email.position,
          department: email.department
            ? HunterClient.normalizeDepartment(email.department)
            : null,
          seniority: email.seniority
            ? HunterClient.normalizeSeniority(email.seniority)
            : null,
          confidence: email.confidence / 100,
          enrichedAt: new Date(),
          source: 'HUNTER',
          isVerified: email.verification?.status === 'valid',
        },
      })
      contactsCreated++
    }
  }

  return {
    success: true,
    contactsFound: emails.length,
    contactsCreated,
    creditsUsed: emails.length,
  }
}

/**
 * Enrich using Snov.io
 */
async function enrichWithSnovio(
  companyId: string,
  options: EnrichmentOptions = {}
): Promise<EnrichmentResult> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  })

  if (!company || !company.domain) {
    return {
      success: false,
      contactsFound: 0,
      contactsCreated: 0,
      creditsUsed: 0,
      error: 'Company domain not available',
    }
  }

  const limit = options.limit || 10

  // Search for emails
  const emails = await snovioClient.domainSearch(company.domain, {
    type: 'personal',
    limit,
  })

  if (emails.length === 0) {
    return {
      success: true,
      contactsFound: 0,
      contactsCreated: 0,
      creditsUsed: 0,
    }
  }

  // Track credits
  await useCredits('SNOVIO', emails.length)

  // Create contacts
  let contactsCreated = 0

  for (const email of emails) {
    const existing = await prisma.person.findFirst({
      where: {
        companyId,
        OR: [
          { email: email.email },
          { name: `${email.firstName} ${email.lastName}` },
        ],
      },
    })

    if (existing) {
      await prisma.person.update({
        where: { id: existing.id },
        data: {
          email: email.email || existing.email,
          emailStatus: SnovioClient.normalizeEmailStatus(email.status),
          title: email.position || existing.title,
          confidence: 0.85, // Snov.io generally reliable
          enrichedAt: new Date(),
          source: 'SNOVIO',
        },
      })
    } else {
      await prisma.person.create({
        data: {
          companyId,
          name: `${email.firstName} ${email.lastName}`,
          email: email.email,
          emailStatus: SnovioClient.normalizeEmailStatus(email.status),
          title: email.position,
          role: email.position,
          confidence: 0.85,
          enrichedAt: new Date(),
          source: 'SNOVIO',
          isVerified: email.status === 'valid',
        },
      })
      contactsCreated++
    }
  }

  return {
    success: true,
    contactsFound: emails.length,
    contactsCreated,
    creditsUsed: emails.length,
  }
}

/**
 * Multi-service contact enrichment with waterfall fallback
 * Tries services in order: Apollo -> Hunter -> Snov.io -> Web Scraper
 */
export async function enrichCompanyContactsMultiService(
  companyId: string,
  options: EnrichmentOptions = {}
): Promise<EnrichmentResult & { serviceUsed: string }> {
  console.log(`[Enrichment] Starting multi-service enrichment for company ${companyId}`)

  // Get available services
  const available = await getAvailableServices()

  // Define fallback order (best quality first)
  const serviceOrder: Array<{
    name: string
    configured: boolean
    credits: number
  }> = [
    { name: 'apollo', configured: available.apollo.configured, credits: available.apollo.credits },
    { name: 'hunter', configured: available.hunter.configured, credits: available.hunter.credits },
    { name: 'snovio', configured: available.snovio.configured, credits: available.snovio.credits },
  ]

  // Try each service in order
  for (const service of serviceOrder) {
    // Skip if not configured
    if (!service.configured) {
      console.log(`[Enrichment] ${service.name} not configured, skipping`)
      continue
    }

    // Skip if no credits
    if (service.credits === 0) {
      console.log(`[Enrichment] ${service.name} out of credits, skipping`)
      continue
    }

    console.log(`[Enrichment] Trying ${service.name}... (${service.credits} credits available)`)

    try {
      let result: EnrichmentResult

      switch (service.name) {
        case 'apollo':
          result = await enrichCompanyContacts(companyId, options)
          break
        case 'hunter':
          result = await enrichWithHunter(companyId, options)
          break
        case 'snovio':
          result = await enrichWithSnovio(companyId, options)
          break
        default:
          continue
      }

      if (result.success && result.contactsFound > 0) {
        console.log(`[Enrichment] ✓ ${service.name} found ${result.contactsFound} contacts`)
        return {
          ...result,
          serviceUsed: service.name,
        }
      } else {
        console.log(`[Enrichment] ${service.name} found no contacts, trying next service`)
      }
    } catch (error) {
      console.error(`[Enrichment] ${service.name} error:`, error)
      // Continue to next service
    }
  }

  // All paid services failed or unavailable, return failure
  // Note: We don't fallback to web scraper here because it's handled separately
  console.log('[Enrichment] All enrichment services exhausted')

  return {
    success: false,
    contactsFound: 0,
    contactsCreated: 0,
    creditsUsed: 0,
    serviceUsed: 'none',
    error: 'No contacts found from any configured service. Try again later when credits refresh.',
  }
}
