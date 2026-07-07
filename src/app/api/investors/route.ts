import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const country = searchParams.get('country') || undefined
  const days = parseInt(searchParams.get('days') || '90')

  const since = new Date()
  since.setDate(since.getDate() - days)

  const events = await prisma.fundingEvent.findMany({
    where: {
      announcedAt: { gte: since },
      company: { archivedAt: null, ...(country && { country }) },
    },
    select: {
      investors: true,
      leadInvestor: true,
      roundType: true,
      amountCents: true,
      announcedAt: true,
      company: {
        select: { id: true, name: true, tags: true },
      },
    },
  })

  // Aggregate investor data
  const investorMap: Record<string, {
    name: string
    dealCount: number
    leadCount: number
    totalRaisedM: number
    rounds: Record<string, number>
    recentDeal: string
    portfolioCompanies: { id: string; name: string }[]
  }> = {}

  for (const event of events) {
    let investors: string[] = []
    try { investors = event.investors ? JSON.parse(event.investors) : [] } catch { investors = [] }

    if (event.leadInvestor && !investors.includes(event.leadInvestor)) {
      investors.unshift(event.leadInvestor)
    }

    for (const inv of investors) {
      const name = inv.trim()
      if (!name) continue
      if (!investorMap[name]) {
        investorMap[name] = {
          name,
          dealCount: 0,
          leadCount: 0,
          totalRaisedM: 0,
          rounds: {},
          recentDeal: event.announcedAt.toISOString(),
          portfolioCompanies: [],
        }
      }

      const entry = investorMap[name]
      entry.dealCount++
      if (event.leadInvestor === name) entry.leadCount++
      if (event.amountCents) entry.totalRaisedM += Number(event.amountCents) / 100_000_000
      entry.rounds[event.roundType] = (entry.rounds[event.roundType] || 0) + 1

      const newer = new Date(event.announcedAt) > new Date(entry.recentDeal)
      if (newer) entry.recentDeal = event.announcedAt.toISOString()

      if (entry.portfolioCompanies.length < 5 && !entry.portfolioCompanies.find((c) => c.id === event.company.id)) {
        entry.portfolioCompanies.push({ id: event.company.id, name: event.company.name })
      }
    }
  }

  const investors = Object.values(investorMap)
    .sort((a, b) => b.dealCount - a.dealCount)
    .slice(0, 50)

  return NextResponse.json({ investors, totalEvents: events.length })
}
