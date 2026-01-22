import { prisma } from '@/lib/prisma'
import { apolloClient, ApolloClient, type ApolloPerson } from '@/lib/api-clients/apollo'
import { hasCredits, useCredits, getRemainingCredits } from './credits'

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
