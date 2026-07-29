import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAlertNotification } from '@/email'
import type { Prisma } from '@prisma/client'
import type { RoundType } from '@/types/enums'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const alerts = await prisma.alert.findMany({
      where: {
        enabled: true,
        OR: [
          { lastSentAt: null },
          { lastSentAt: { lt: oneDayAgo } },
        ],
      },
      include: {
        user: {
          select: { email: true },
        },
      },
    })

    let alertsProcessed = 0
    let emailsSent = 0

    for (const alert of alerts) {
      alertsProcessed++

      const filters = alert.filters as unknown as Record<string, unknown>
      const lastCheck = alert.lastSentAt || oneDayAgo

      const events = await findMatchingEvents(filters, lastCheck)

      if (events.length === 0) {
        continue
      }

      const matches = events.map((event) => ({
        companyName: event.company.name,
        companyId: event.company.id,
        roundType: event.roundType.replace('_', ' '),
        amount: event.amountCents
          ? `$${(Number(event.amountCents) / 100).toLocaleString()}`
          : undefined,
        announcedAt: event.announcedAt.toLocaleDateString(),
        sourceUrl: event.sourceUrl || undefined,
      }))

      const sent = await sendAlertNotification(
        alert.email,
        alert.name,
        matches
      )

      if (sent) {
        emailsSent++
      }

      await prisma.alert.update({
        where: { id: alert.id },
        data: {
          lastSentAt: new Date(),
          matchCount: { increment: events.length },
        },
      })
    }

    return NextResponse.json({
      success: true,
      alertsProcessed,
      emailsSent,
    })
  } catch (error) {
    console.error('Alert cron error:', error)
    return NextResponse.json(
      { error: 'Alert processing failed' },
      { status: 500 }
    )
  }
}

async function findMatchingEvents(
  filters: Record<string, unknown>,
  sinceDate: Date
) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const companyWhere: Prisma.CompanyWhereInput = {
    archivedAt: null,
  }

  if (filters.country) {
    companyWhere.country = filters.country as string
  }
  if (filters.state) {
    companyWhere.state = filters.state as string
  }
  if (filters.industry) {
    companyWhere.tags = { contains: filters.industry as string }
  }
  if (filters.hiringNow) {
    companyWhere.jobPostings = {
      some: {
        postedAt: { gte: thirtyDaysAgo },
        archivedAt: null,
      },
    }
  }

  const where: Prisma.FundingEventWhereInput = {
    announcedAt: { gte: sinceDate },
    company: companyWhere,
  }

  if (filters.roundType) {
    where.roundType = filters.roundType as RoundType
  }
  if (filters.minAmount) {
    where.amountCents = { gte: BigInt((filters.minAmount as number) * 100) }
  }
  if (filters.maxAmount) {
    where.amountCents = {
      ...((where.amountCents as object) || {}),
      lte: BigInt((filters.maxAmount as number) * 100),
    }
  }

  return prisma.fundingEvent.findMany({
    where,
    include: {
      company: {
        select: { id: true, name: true },
      },
    },
    orderBy: { announcedAt: 'desc' },
    take: 20,
  })
}
