import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enrichCompanyContactsMultiService } from '@/services/enrichment'
import { getAvailableServices } from '@/services/credits'

/**
 * Auto-Enrichment Cron Job
 *
 * Runs daily at 4 AM UTC to automatically find contacts for high-priority companies:
 * - Companies in user watchlists
 * - Prospects with high confidence (>= 70%)
 *
 * Only enriches companies that:
 * - Have no contacts yet OR haven't been enriched in 30+ days
 * - Have available credits
 *
 * Targets: Founders, C-Suite, VPs, Directors in key departments
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting auto-enrichment job...')

    // Check available services before starting
    const availableServices = await getAvailableServices()
    const hasAnyCredits =
      availableServices.apollo.credits > 0 ||
      availableServices.hunter.credits > 0 ||
      availableServices.snovio.credits > 0

    if (!hasAnyCredits) {
      console.log('[Cron] No credits available in any service, skipping enrichment')
      return NextResponse.json({
        success: true,
        message: 'No credits available, skipping auto-enrichment',
        companiesProcessed: 0,
        contactsFound: 0,
        creditsUsed: 0,
      })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Find high-priority companies that need enrichment
    // Priority 1: Prospects with confidence >= 70% (likely to raise funding soon)
    const highConfidenceProspects = await prisma.prospect.findMany({
      where: {
        confidenceScore: { gte: 0.7 },
        archivedAt: null,
        company: {
          archivedAt: null,
          domain: { not: null }, // Must have domain to enrich
          OR: [
            {
              // No contacts yet
              people: { none: {} },
            },
            {
              // No enrichment in 30+ days
              people: {
                none: {
                  enrichedAt: { gte: thirtyDaysAgo },
                },
              },
            },
          ],
        },
      },
      include: {
        company: {
          include: {
            _count: {
              select: { people: true },
            },
          },
        },
        user: {
          select: { id: true, email: true },
        },
      },
      orderBy: [
        { confidenceScore: 'desc' }, // Highest confidence first
        { createdAt: 'desc' }, // Most recent first
      ],
      take: 20, // Limit to top 20 prospects
    })

    console.log(`[Cron] Found ${highConfidenceProspects.length} high-confidence prospects`)

    // Priority 2: Watchlist companies (user explicitly interested)
    const watchlistCompanies = await prisma.watchlist.findMany({
      where: {
        company: {
          archivedAt: null,
          domain: { not: null },
          OR: [
            {
              // No contacts yet
              people: { none: {} },
            },
            {
              // No enrichment in 30+ days
              people: {
                none: {
                  enrichedAt: { gte: thirtyDaysAgo },
                },
              },
            },
          ],
        },
      },
      include: {
        company: {
          include: {
            _count: {
              select: { people: true },
            },
          },
        },
        user: {
          select: { id: true, email: true },
        },
      },
      orderBy: {
        createdAt: 'desc', // Most recently added first
      },
      take: 30, // Limit to 30 watchlist companies
    })

    console.log(`[Cron] Found ${watchlistCompanies.length} watchlist companies`)

    // Combine and deduplicate by company ID
    const companyMap = new Map<
      string,
      {
        companyId: string
        companyName: string
        priority: 'prospect' | 'watchlist'
        confidenceScore?: number
        userId: string
      }
    >()

    // Add prospects (higher priority)
    for (const prospect of highConfidenceProspects) {
      if (!companyMap.has(prospect.companyId)) {
        companyMap.set(prospect.companyId, {
          companyId: prospect.companyId,
          companyName: prospect.company.name,
          priority: 'prospect',
          confidenceScore: prospect.confidenceScore,
          userId: prospect.userId,
        })
      }
    }

    // Add watchlist companies (lower priority, don't override prospects)
    for (const watchlist of watchlistCompanies) {
      if (!companyMap.has(watchlist.companyId)) {
        companyMap.set(watchlist.companyId, {
          companyId: watchlist.companyId,
          companyName: watchlist.company.name,
          priority: 'watchlist',
          userId: watchlist.userId,
        })
      }
    }

    const companies = Array.from(companyMap.values())

    if (companies.length === 0) {
      console.log('[Cron] No companies need enrichment')
      return NextResponse.json({
        success: true,
        message: 'No companies need enrichment at this time',
        companiesProcessed: 0,
        contactsFound: 0,
        creditsUsed: 0,
      })
    }

    console.log(`[Cron] Processing ${companies.length} unique companies`)

    // Process companies in batches to stay within timeout limits
    const BATCH_SIZE = 10
    const results = {
      companiesProcessed: 0,
      companiesEnriched: 0,
      contactsFound: 0,
      creditsUsed: 0,
      errors: [] as string[],
      serviceBreakdown: {
        apollo: 0,
        hunter: 0,
        snovio: 0,
        scraper: 0,
      },
    }

    for (let i = 0; i < companies.length; i += BATCH_SIZE) {
      const batch = companies.slice(i, i + BATCH_SIZE)

      // Check if we still have credits
      const currentServices = await getAvailableServices()
      const stillHasCredits =
        currentServices.apollo.credits > 0 ||
        currentServices.hunter.credits > 0 ||
        currentServices.snovio.credits > 0

      if (!stillHasCredits) {
        console.log('[Cron] All credits exhausted, stopping enrichment')
        break
      }

      const batchResults = await Promise.allSettled(
        batch.map(async (company) => {
          try {
            console.log(
              `[Cron] Enriching ${company.companyName} (${company.priority}, confidence: ${company.confidenceScore || 'N/A'})`
            )

            // Target key decision makers
            const result = await enrichCompanyContactsMultiService(company.companyId, {
              departments: ['engineering', 'human_resources', 'operations'],
              seniorities: ['founder', 'c_suite', 'vp', 'director'],
              limit: 5, // Limit to top 5 contacts per company
            })

            results.companiesProcessed++

            if (result.success && result.contactsFound > 0) {
              results.companiesEnriched++
              results.contactsFound += result.contactsFound
              results.creditsUsed += result.creditsUsed

              // Track which service was used
              if (result.serviceUsed === 'apollo') {
                results.serviceBreakdown.apollo++
              } else if (result.serviceUsed === 'hunter') {
                results.serviceBreakdown.hunter++
              } else if (result.serviceUsed === 'snovio') {
                results.serviceBreakdown.snovio++
              }

              console.log(
                `[Cron] ✓ Found ${result.contactsFound} contacts for ${company.companyName} using ${result.serviceUsed}`
              )
            } else {
              console.log(`[Cron] No contacts found for ${company.companyName}`)
            }

            return { success: true }
          } catch (error) {
            console.error(`[Cron] Error enriching ${company.companyName}:`, error)
            results.errors.push(`${company.companyName}: ${error}`)
            throw error
          }
        })
      )

      // Log batch progress
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(companies.length / BATCH_SIZE)
      console.log(`[Cron] Completed batch ${batchNumber}/${totalBatches}`)
    }

    // Get final credit status
    const finalServices = await getAvailableServices()

    console.log('[Cron] Auto-enrichment job completed successfully')
    console.log(`[Cron] Summary:`)
    console.log(`  - Companies processed: ${results.companiesProcessed}`)
    console.log(`  - Companies enriched: ${results.companiesEnriched}`)
    console.log(`  - Total contacts found: ${results.contactsFound}`)
    console.log(`  - Total credits used: ${results.creditsUsed}`)
    console.log(`  - Services: Apollo=${results.serviceBreakdown.apollo}, Hunter=${results.serviceBreakdown.hunter}, Snov.io=${results.serviceBreakdown.snovio}`)
    console.log(`  - Remaining credits: Apollo=${finalServices.apollo.credits}, Hunter=${finalServices.hunter.credits}, Snov.io=${finalServices.snovio.credits}`)

    return NextResponse.json({
      success: true,
      summary: {
        ...results,
        remainingCredits: {
          apollo: finalServices.apollo.credits,
          hunter: finalServices.hunter.credits,
          snovio: finalServices.snovio.credits,
        },
      },
    })
  } catch (error) {
    console.error('[Cron] Fatal error in auto-enrichment job:', error)
    return NextResponse.json(
      { error: 'Auto-enrichment job failed', details: String(error) },
      { status: 500 }
    )
  }
}
