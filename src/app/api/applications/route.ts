import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {
      userId: session.user.id,
      archivedAt: null,
    }

    if (status && status !== 'all') {
      where.status = status
    }

    const [applications, total] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              domain: true,
              logoUrl: true,
              isHiring: true,
            },
          },
        },
        orderBy: [{ appliedAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.jobApplication.count({ where }),
    ])

    return NextResponse.json({
      applications,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Get applications error:', error)
    return NextResponse.json(
      { error: 'Failed to get applications' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { companyId, position, url, source, notes } = body

    if (!companyId || !position) {
      return NextResponse.json(
        { error: 'Company ID and position are required' },
        { status: 400 }
      )
    }

    // Check if application already exists
    const existing = await prisma.jobApplication.findFirst({
      where: {
        userId: session.user.id,
        companyId,
        position,
        archivedAt: null,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Application already exists for this position' },
        { status: 400 }
      )
    }

    const application = await prisma.jobApplication.create({
      data: {
        userId: session.user.id,
        companyId,
        position,
        url,
        source,
        notes,
        status: 'APPLIED',
        appliedAt: new Date(),
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
      },
    })

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error('Create application error:', error)
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    )
  }
}
