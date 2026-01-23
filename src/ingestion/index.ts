import { prisma } from '@/lib/prisma'
import { TechCrunchSource } from './sources/techcrunch'
import { VentureBeatSource } from './sources/venturebeat'
import { NewsAPISource } from './sources/newsapi'
import type { ParsedFundingEvent, IngestionResult } from './types'
import type { IngestionStatus, LogLevel } from '@prisma/client'

const sources: Record<string, TechCrunchSource | VentureBeatSource | NewsAPISource> = {
  techcrunch: new TechCrunchSource(),
  venturebeat: new VentureBeatSource(),
  // Only include NewsAPI if API key is configured
  ...(process.env.NEWSAPI_KEY ? { newsapi: new NewsAPISource() } : {}),
}

export async function runIngestion(
  sourceName?: string | null
): Promise<IngestionResult> {
  const result: IngestionResult = {
    source: sourceName || 'all',
    itemsProcessed: 0,
    itemsCreated: 0,
    itemsSkipped: 0,
    errors: [],
  }

  const run = await prisma.ingestionRun.create({
    data: {
      source: sourceName,
      status: 'RUNNING' as IngestionStatus,
    },
  })

  try {
    const sourcesToRun = sourceName
      ? { [sourceName]: sources[sourceName as keyof typeof sources] }
      : sources

    for (const [name, source] of Object.entries(sourcesToRun)) {
      if (!source) {
        result.errors.push(`Unknown source: ${name}`)
        continue
      }

      await log(run.id, 'INFO', `Starting ingestion from ${name}`)

      try {
        const items = await source.fetchFeed()
        await log(run.id, 'INFO', `Fetched ${items.length} items from ${name}`)

        for (const item of items) {
          result.itemsProcessed++

          try {
            const parsed = source.parseItem(item)

            if (!parsed) {
              result.itemsSkipped++
              continue
            }

            const created = await processEvent(parsed, run.id)

            if (created) {
              result.itemsCreated++
            } else {
              result.itemsSkipped++
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            result.errors.push(`Error processing item: ${message}`)
            await log(run.id, 'ERROR', `Error processing item: ${message}`)
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Error fetching from ${name}: ${message}`)
        await log(run.id, 'ERROR', `Error fetching from ${name}: ${message}`)
      }
    }

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED' as IngestionStatus,
        completedAt: new Date(),
        itemsProcessed: result.itemsProcessed,
        errorCount: result.errors.length,
      },
    })

    await log(
      run.id,
      'INFO',
      `Ingestion completed: ${result.itemsCreated} created, ${result.itemsSkipped} skipped`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED' as IngestionStatus,
        completedAt: new Date(),
        errorCount: result.errors.length + 1,
      },
    })

    await log(run.id, 'ERROR', `Ingestion failed: ${message}`)

    throw error
  }

  return result
}

async function processEvent(
  event: ParsedFundingEvent,
  runId: string
): Promise<boolean> {
  const existingEvent = await prisma.fundingEvent.findFirst({
    where: { sourceUrl: event.sourceUrl },
  })

  if (existingEvent) {
    return false
  }

  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const threeDaysLater = new Date()
  threeDaysLater.setDate(threeDaysLater.getDate() + 3)

  // SQLite-compatible case-insensitive search
  let company = await prisma.company.findFirst({
    where: {
      name: event.companyName,
      archivedAt: null,
    },
  })

  // Try case-insensitive match if exact match fails
  if (!company) {
    const companies = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM Company WHERE LOWER(name) = LOWER(?) AND archivedAt IS NULL LIMIT 1`,
      event.companyName
    )
    if (companies.length > 0) {
      company = await prisma.company.findUnique({ where: { id: companies[0].id } })
    }
  }

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: event.companyName,
        domain: event.domain,
        country: event.country,
        state: event.state,
        city: event.city,
        tags: event.tags,
      },
    })

    await log(runId, 'INFO', `Created company: ${event.companyName}`)
  }

  const duplicateEvent = await prisma.fundingEvent.findFirst({
    where: {
      companyId: company.id,
      roundType: event.roundType,
      announcedAt: {
        gte: threeDaysAgo,
        lte: threeDaysLater,
      },
    },
  })

  if (duplicateEvent) {
    await log(
      runId,
      'INFO',
      `Duplicate event for ${event.companyName} (${event.roundType}), skipping`
    )
    return false
  }

  await prisma.fundingEvent.create({
    data: {
      companyId: company.id,
      roundType: event.roundType,
      amountCents: event.amountCents,
      announcedAt: event.announcedAt,
      investors: event.investors,
      summary: event.summary,
      sourceUrl: event.sourceUrl,
      sourceName: event.sourceName,
    },
  })

  await log(
    runId,
    'INFO',
    `Created funding event: ${event.companyName} - ${event.roundType}`
  )

  return true
}

async function log(
  runId: string,
  level: LogLevel,
  message: string,
  details?: object
) {
  await prisma.ingestionLog.create({
    data: {
      runId,
      level,
      message,
      details: details ? JSON.parse(JSON.stringify(details)) : undefined,
    },
  })
}

export { sources }
