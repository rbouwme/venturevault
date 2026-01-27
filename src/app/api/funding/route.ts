import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getFundingEvents, getFundingEventsCount } from '@/services/funding'
import { getMetroArea, buildMetroAreaFilter } from '@/lib/metro-areas'
import type { FundingFilters } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const filters: FundingFilters = {
    country: searchParams.get('country') || undefined,
    state: searchParams.get('state') || undefined,
    city: searchParams.get('city') || undefined,
    metro: searchParams.get('metro') || undefined,
    industry: searchParams.get('industry') || undefined,
    roundType: searchParams.get('roundType') || undefined,
    minAmount: searchParams.get('minAmount') ? parseInt(searchParams.get('minAmount')!) : undefined,
    maxAmount: searchParams.get('maxAmount') ? parseInt(searchParams.get('maxAmount')!) : undefined,
    hiringNow: searchParams.get('hiringNow') === 'true',
    sortBy: (searchParams.get('sortBy') as 'newest' | 'amount') || 'newest',
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
  }

  try {
    const [events, totalCount] = await Promise.all([
      getFundingEvents(filters),
      getFundingEventsCount(filters),
    ])

    // If we have funding events, return them
    if (events.length > 0) {
      return NextResponse.json({
        events,
        totalCount,
        totalPages: Math.ceil(totalCount / (filters.limit || 20)),
        currentPage: filters.page || 1,
        dataSource: 'funding_events',
      })
    }

    // Fallback: Show recently synced YC companies as "startups"
    const page = filters.page || 1
    const limit = filters.limit || 20

    const where: Record<string, unknown> = {
      archivedAt: null,
      dataSource: 'YC',
    }

    if (filters.country) where.country = filters.country
    if (filters.state) where.state = filters.state
    if (filters.hiringNow) where.isHiring = true
    if (filters.industry) where.tags = { contains: filters.industry }

    // Metro area filter: matches by city names + state fallback
    if (filters.metro) {
      const metro = getMetroArea(filters.metro)
      if (metro) {
        const metroFilter = buildMetroAreaFilter(metro)
        Object.assign(where, metroFilter)
      }
    } else if (filters.city) {
      where.city = { contains: filters.city }
    }

    const [companies, companyCount] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy: filters.sortBy === 'amount'
          ? { headcount: 'desc' }
          : { lastSyncedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          fundingEvents: {
            orderBy: { announcedAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.company.count({ where }),
    ])

    // Transform companies into a format similar to funding events
    const companyEvents = companies.map((company) => ({
      id: company.id,
      companyId: company.id,
      roundType: company.ycBatch ? `YC ${company.ycBatch}` : 'YC Company',
      amountCents: null,
      announcedAt: company.lastSyncedAt || company.createdAt,
      investors: null,
      leadInvestor: null,
      summary: company.oneLiner || company.description,
      sourceUrl: company.ycUrl,
      sourceName: 'Y Combinator',
      company: {
        id: company.id,
        name: company.name,
        domain: company.domain,
        description: company.description,
        country: company.country,
        state: company.state,
        city: company.city,
        logoUrl: company.logoUrl,
        tags: company.tags,
        isHiring: company.isHiring,
        oneLiner: company.oneLiner,
        ycBatch: company.ycBatch,
      },
    }))

    return NextResponse.json({
      events: companyEvents,
      totalCount: companyCount,
      totalPages: Math.ceil(companyCount / limit),
      currentPage: page,
      dataSource: 'yc_companies',
    })
  } catch (error) {
    console.error('Error fetching funding events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch funding events' },
      { status: 500 }
    )
  }
}
