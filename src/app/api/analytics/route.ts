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
      company: {
        archivedAt: null,
        ...(country && { country }),
      },
    },
    select: {
      announcedAt: true,
      roundType: true,
      amountCents: true,
      investors: true,
      leadInvestor: true,
      company: {
        select: { tags: true, country: true },
      },
    },
    orderBy: { announcedAt: 'asc' },
  })

  // Weekly funding volume
  const weekMap: Record<string, { week: string; count: number; totalM: number }> = {}
  for (const e of events) {
    const d = new Date(e.announcedAt)
    // Round to Monday of that week
    const day = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    monday.setHours(0, 0, 0, 0)
    const key = monday.toISOString().split('T')[0]
    if (!weekMap[key]) weekMap[key] = { week: key, count: 0, totalM: 0 }
    weekMap[key].count++
    if (e.amountCents) {
      weekMap[key].totalM += Number(e.amountCents) / 100_000_000 // cents → $M
    }
  }
  const weeklyVolume = Object.values(weekMap).sort((a, b) => a.week.localeCompare(b.week))

  // By round type
  const roundMap: Record<string, { roundType: string; count: number; totalM: number }> = {}
  for (const e of events) {
    const rt = e.roundType || 'UNKNOWN'
    if (!roundMap[rt]) roundMap[rt] = { roundType: rt, count: 0, totalM: 0 }
    roundMap[rt].count++
    if (e.amountCents) roundMap[rt].totalM += Number(e.amountCents) / 100_000_000
  }
  const byRoundType = Object.values(roundMap).sort((a, b) => b.count - a.count).slice(0, 8)

  // By industry (from tags)
  const industryMap: Record<string, number> = {}
  for (const e of events) {
    let tags: string[] = []
    try { tags = e.company.tags ? JSON.parse(e.company.tags) : [] } catch { tags = [] }
    for (const tag of tags.slice(0, 2)) {
      industryMap[tag] = (industryMap[tag] || 0) + 1
    }
  }
  const byIndustry = Object.entries(industryMap)
    .map(([industry, count]) => ({ industry, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Summary stats
  const totalRaised = events.reduce((sum, e) => sum + (e.amountCents ? Number(e.amountCents) : 0), 0)
  const withAmount = events.filter((e) => e.amountCents)
  const avgDeal = withAmount.length ? totalRaised / withAmount.length : 0

  return NextResponse.json({
    weeklyVolume,
    byRoundType,
    byIndustry,
    stats: {
      totalDeals: events.length,
      totalRaisedM: totalRaised / 100_000_000,
      avgDealM: avgDeal / 100_000_000,
      withAmountCount: withAmount.length,
    },
  })
}
