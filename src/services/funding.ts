import { prisma } from '@/lib/prisma'
import { Prisma, RoundType } from '@prisma/client'
import { getMetroArea } from '@/lib/metro-areas'
import type { FundingFilters, CompanyWithRelations, FundingEventWithCompany } from '@/types'

function buildMetroCompanyConditions(metroId: string): Prisma.CompanyWhereInput | null {
  const metro = getMetroArea(metroId)
  if (!metro) return null

  const conditions: Prisma.CompanyWhereInput[] = metro.cities.map((city) => ({
    city: { contains: city },
  }))

  if (metro.stateFallback) {
    conditions.push({
      state: metro.stateFallback,
      city: null,
    })
  }

  return { OR: conditions }
}

export async function getFundingEvents(filters: FundingFilters = {}): Promise<FundingEventWithCompany[]> {
  const {
    startDate,
    endDate,
    country,
    state,
    city,
    metro,
    industry,
    roundType,
    minAmount,
    maxAmount,
    hiringNow,
    sortBy = 'newest',
    page = 1,
    limit = 20,
  } = filters

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const companyWhere: Prisma.CompanyWhereInput = {
    archivedAt: null,
    ...(country && { country }),
    ...(state && { state }),
    ...(industry && { tags: { has: industry } }),
    ...(hiringNow && {
      jobPostings: {
        some: {
          postedAt: { gte: thirtyDaysAgo },
          archivedAt: null,
        },
      },
    }),
  }

  // Apply metro area or plain city filter
  if (metro) {
    const metroFilter = buildMetroCompanyConditions(metro)
    if (metroFilter) Object.assign(companyWhere, metroFilter)
  } else if (city) {
    companyWhere.city = { contains: city }
  }

  const where: Prisma.FundingEventWhereInput = {
    announcedAt: {
      gte: startDate ? new Date(startDate) : thirtyDaysAgo,
      lte: endDate ? new Date(endDate) : new Date(),
    },
    company: companyWhere,
    ...(roundType && { roundType: roundType as RoundType }),
    ...(minAmount && { amountCents: { gte: BigInt(minAmount * 100) } }),
    ...(maxAmount && { amountCents: { lte: BigInt(maxAmount * 100) } }),
  }

  const orderBy: Prisma.FundingEventOrderByWithRelationInput =
    sortBy === 'amount'
      ? { amountCents: 'desc' }
      : { announcedAt: 'desc' }

  const events = await prisma.fundingEvent.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    include: {
      company: {
        include: {
          _count: {
            select: {
              jobPostings: {
                where: {
                  postedAt: { gte: thirtyDaysAgo },
                  archivedAt: null,
                },
              },
            },
          },
        },
      },
    },
  })

  return events as FundingEventWithCompany[]
}

export async function getFundingEventsCount(filters: FundingFilters = {}): Promise<number> {
  const {
    startDate,
    endDate,
    country,
    state,
    city,
    metro,
    industry,
    roundType,
    minAmount,
    maxAmount,
    hiringNow,
  } = filters

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const companyWhere: Prisma.CompanyWhereInput = {
    archivedAt: null,
    ...(country && { country }),
    ...(state && { state }),
    ...(industry && { tags: { has: industry } }),
    ...(hiringNow && {
      jobPostings: {
        some: {
          postedAt: { gte: thirtyDaysAgo },
          archivedAt: null,
        },
      },
    }),
  }

  if (metro) {
    const metroFilter = buildMetroCompanyConditions(metro)
    if (metroFilter) Object.assign(companyWhere, metroFilter)
  } else if (city) {
    companyWhere.city = { contains: city }
  }

  const where: Prisma.FundingEventWhereInput = {
    announcedAt: {
      gte: startDate ? new Date(startDate) : thirtyDaysAgo,
      lte: endDate ? new Date(endDate) : new Date(),
    },
    company: companyWhere,
    ...(roundType && { roundType: roundType as RoundType }),
    ...(minAmount && { amountCents: { gte: BigInt(minAmount * 100) } }),
    ...(maxAmount && { amountCents: { lte: BigInt(maxAmount * 100) } }),
  }

  return prisma.fundingEvent.count({ where })
}

export async function getCompanyById(id: string): Promise<CompanyWithRelations | null> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const company = await prisma.company.findUnique({
    where: { id, archivedAt: null },
    include: {
      fundingEvents: {
        orderBy: { announcedAt: 'desc' },
      },
      jobPostings: {
        where: {
          postedAt: { gte: thirtyDaysAgo },
          archivedAt: null,
        },
        orderBy: { postedAt: 'desc' },
      },
      people: {
        where: { archivedAt: null },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  return company as CompanyWithRelations | null
}

export async function getCompanies(filters: {
  search?: string
  country?: string
  hiringNow?: boolean
  page?: number
  limit?: number
} = {}) {
  const { search, country, hiringNow, page = 1, limit = 20 } = filters

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const where: Prisma.CompanyWhereInput = {
    archivedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search } },
        { domain: { contains: search } },
      ],
    }),
    ...(country && { country }),
    ...(hiringNow && {
      jobPostings: {
        some: {
          postedAt: { gte: thirtyDaysAgo },
          archivedAt: null,
        },
      },
    }),
  }

  return prisma.company.findMany({
    where,
    orderBy: { name: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      _count: {
        select: {
          fundingEvents: true,
          jobPostings: {
            where: {
              postedAt: { gte: thirtyDaysAgo },
              archivedAt: null,
            },
          },
        },
      },
    },
  })
}
