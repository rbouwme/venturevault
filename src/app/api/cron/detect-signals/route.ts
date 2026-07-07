import { NextResponse } from 'next/server'
import { analyzeCompany } from '@/services/prospect-signals'
import { prisma } from '@/lib/prisma'

/**
 * Automated Signal Detection Cron Job
 *
 * Runs daily at 2 AM UTC to:
 * 1. Find candidate companies (recent job postings or funding events)
 * 2. Detect funding signals for each company
 * 3. Create/update Prospect records for high-confidence companies
 * 4. Clean up stale signals (>90 days old)
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting signal detection job...')

    // Step 1: Find candidate companies with recent activity
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const candidateCompanies = await prisma.company.findMany({
      where: {
        OR: [
          {
            jobPostings: {
              some: {
                postedAt: {
                  gte: thirtyDaysAgo,
                },
              },
            },
          },
          {
            fundingEvents: {
              some: {
                announcedAt: {
                  gte: oneYearAgo,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
      },
    })

    console.log(`[Cron] Found ${candidateCompanies.length} candidate companies`)

    // Step 2: Process companies in batches of 100
    const BATCH_SIZE = 100
    const results = {
      processed: 0,
      prospectsCreated: 0,
      prospectsUpdated: 0,
      signalsDetected: 0,
      errors: 0,
    }

    for (let i = 0; i < candidateCompanies.length; i += BATCH_SIZE) {
      const batch = candidateCompanies.slice(i, i + BATCH_SIZE)

      const batchResults = await Promise.allSettled(
        batch.map(async (company) => {
          try {
            // Analyze company for funding signals
            const analysis = await analyzeCompany(company.id)

            // Only create prospects for companies with confidence >= 0.4
            if (analysis.confidenceScore < 0.4) {
              return { processed: true, prospectCreated: false }
            }

            // Get all users to create prospects for
            const users = await prisma.user.findMany({
              select: { id: true },
            })

            // Create or update prospects for each user
            for (const user of users) {
              const existingProspect = await prisma.prospect.findUnique({
                where: {
                  userId_companyId: {
                    userId: user.id,
                    companyId: company.id,
                  },
                },
                include: {
                  signals: true,
                },
              })

              if (existingProspect) {
                // Update existing prospect
                await prisma.prospect.update({
                  where: { id: existingProspect.id },
                  data: {
                    confidenceScore: analysis.confidenceScore,
                    timelinePrediction: analysis.timelinePrediction,
                    signalCount: analysis.signals.length,
                    lastSignalAt: new Date(),
                  },
                })

                // Delete old signals and create new ones
                await prisma.prospectSignal.deleteMany({
                  where: { prospectId: existingProspect.id },
                })

                results.prospectsUpdated++
              } else {
                // Create new prospect
                const newProspect = await prisma.prospect.create({
                  data: {
                    userId: user.id,
                    companyId: company.id,
                    confidenceScore: analysis.confidenceScore,
                    timelinePrediction: analysis.timelinePrediction,
                    signalCount: analysis.signals.length,
                    lastSignalAt: new Date(),
                    status: 'NEW',
                    priority: analysis.confidenceScore >= 0.7 ? 'HIGH' : 'MEDIUM',
                    source: 'AUTO_SIGNAL',
                  },
                })

                results.prospectsCreated++
              }

              // Get the prospect (either existing or newly created)
              const prospect = await prisma.prospect.findUnique({
                where: {
                  userId_companyId: {
                    userId: user.id,
                    companyId: company.id,
                  },
                },
              })

              if (!prospect) continue

              // Create signal records
              await prisma.prospectSignal.createMany({
                data: analysis.signals.map((signal) => ({
                  prospectId: prospect.id,
                  companyId: company.id,
                  type: signal.type,
                  strength: signal.strength,
                  description: signal.description,
                  metadata: signal.metadata ? JSON.stringify(signal.metadata) : null,
                  detectedAt: new Date(),
                  expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
                })),
              })

              results.signalsDetected += analysis.signals.length
            }

            results.processed++
            return { processed: true, prospectCreated: true }
          } catch (error) {
            console.error(`[Cron] Error processing company ${company.id}:`, error)
            results.errors++
            throw error
          }
        })
      )

      // Log batch progress
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(candidateCompanies.length / BATCH_SIZE)
      console.log(`[Cron] Completed batch ${batchNumber}/${totalBatches}`)
    }

    // Step 3: Clean up stale signals (>90 days old)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const deletedSignals = await prisma.prospectSignal.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            detectedAt: {
              lt: ninetyDaysAgo,
            },
          },
        ],
      },
    })

    console.log(`[Cron] Deleted ${deletedSignals.count} stale signals`)

    // Step 4: Update prospect signal counts
    const allProspects = await prisma.prospect.findMany({
      include: {
        _count: {
          select: { signals: true },
        },
      },
    })

    await Promise.all(
      allProspects.map((prospect) =>
        prisma.prospect.update({
          where: { id: prospect.id },
          data: { signalCount: prospect._count.signals },
        })
      )
    )

    console.log('[Cron] Signal detection job completed successfully')

    return NextResponse.json({
      success: true,
      summary: {
        ...results,
        staleSignalsDeleted: deletedSignals.count,
      },
    })
  } catch (error) {
    console.error('[Cron] Fatal error in signal detection job:', error)
    return NextResponse.json(
      { error: 'Signal detection job failed', details: String(error) },
      { status: 500 }
    )
  }
}
