import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const sortBy = searchParams.get('sortBy') || 'contacts'

  try {
    const where = {
      archivedAt: null,
      people: {
        some: {
          archivedAt: null,
        },
      },
    }

    const orderBy =
      sortBy === 'contacts'
        ? { people: { _count: 'desc' as const } }
        : sortBy === 'name'
          ? { name: 'asc' as const }
          : { lastSyncedAt: 'desc' as const }

    const [companies, totalCount] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          people: {
            where: { archivedAt: null },
            select: {
              id: true,
              name: true,
              role: true,
              title: true,
              email: true,
              linkedinUrl: true,
            },
          },
          _count: {
            select: {
              people: {
                where: { archivedAt: null },
              },
            },
          },
          fundingEvents: {
            orderBy: { announcedAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.company.count({ where }),
    ])

    return NextResponse.json({
      companies,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    })
  } catch (error) {
    console.error('Error fetching companies with contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch companies with contacts' },
      { status: 500 }
    )
  }
}
