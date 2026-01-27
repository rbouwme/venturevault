import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { scrapeCompanyContacts } from '@/services/contact-scraper'
import { enrichCompanyContactsMultiService } from '@/services/enrichment'
import { getAvailableServices } from '@/services/credits'

// POST /api/companies/[id]/contacts/find - Automatically find and import contacts from company website
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: companyId } = await params

    // Get company details
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        domain: true,
        ycUrl: true,
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (!company.domain) {
      return NextResponse.json(
        { error: 'Company domain is required to find contacts' },
        { status: 400 }
      )
    }

    // Try multi-service enrichment first (Apollo, Hunter, Snov.io)
    console.log('[API] Trying multi-service enrichment...')
    const enrichmentResult = await enrichCompanyContactsMultiService(companyId, {
      departments: ['engineering', 'human_resources', 'operations'],
      seniorities: ['founder', 'c_suite', 'vp', 'director'],
      limit: 10,
    })

    // If enrichment succeeded, return results
    if (enrichmentResult.success && enrichmentResult.contactsFound > 0) {
      const availableServices = await getAvailableServices()

      return NextResponse.json({
        success: true,
        message: `Found ${enrichmentResult.contactsFound} contacts using ${enrichmentResult.serviceUsed.toUpperCase()} (${enrichmentResult.creditsUsed} credits used)`,
        contactsFound: enrichmentResult.contactsFound,
        contactsCreated: enrichmentResult.contactsCreated,
        serviceUsed: enrichmentResult.serviceUsed,
        creditsUsed: enrichmentResult.creditsUsed,
        availableServices,
      })
    }

    // Fallback: Use web scraper (free, always available)
    console.log('[API] Enrichment services exhausted or unavailable, falling back to web scraper')

    const scrapedContacts = await scrapeCompanyContacts(
      company.domain,
      company.name,
      company.ycUrl || undefined,
      15
    )

    if (scrapedContacts.length === 0) {
      const availableServices = await getAvailableServices()

      return NextResponse.json({
        success: false,
        message: 'No contacts found from any source. Services may be out of credits or company has no public contact information.',
        contactsFound: 0,
        contactsCreated: 0,
        serviceUsed: 'none',
        availableServices,
      })
    }

    // Check which contacts already exist
    const existingContacts = await prisma.person.findMany({
      where: {
        companyId: company.id,
        name: {
          in: scrapedContacts.map(c => c.name),
        },
      },
      select: { name: true },
    })

    const existingNames = new Set(existingContacts.map(c => c.name.toLowerCase()))

    // Create new contacts
    const newContacts = scrapedContacts.filter(
      c => !existingNames.has(c.name.toLowerCase())
    )

    const createdContacts = await Promise.all(
      newContacts.map(contact =>
        prisma.person.create({
          data: {
            companyId: company.id,
            name: contact.name,
            title: contact.title || null,
            email: contact.email || null,
            source: 'SCRAPER',
            emailStatus: contact.email ? 'UNVERIFIED' : 'UNKNOWN',
            isVerified: false,
            role: contact.role || null,
            confidence: contact.confidence || 0.5, // Lower confidence for scraper
          },
        })
      )
    )

    const availableServices = await getAvailableServices()

    return NextResponse.json({
      success: true,
      message: `Found ${scrapedContacts.length} contacts using web scraper (free)`,
      contactsFound: scrapedContacts.length,
      contactsCreated: createdContacts.length,
      contactsAlreadyExisted: scrapedContacts.length - createdContacts.length,
      serviceUsed: 'scraper',
      creditsUsed: 0,
      availableServices,
    })
  } catch (error) {
    console.error('Find contacts error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find contacts',
      },
      { status: 500 }
    )
  }
}
