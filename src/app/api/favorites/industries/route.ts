import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const favorites = await prisma.favoriteIndustry.findMany({
      where: { userId: session.user.id },
      orderBy: { order: 'asc' },
      include: {
        folder: true,
      },
    })
    return NextResponse.json(favorites)
  } catch (error) {
    console.error('Get favorite industries error:', error)
    return NextResponse.json({ error: 'Failed to get favorites' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { industry, folderId } = await request.json()

    if (!industry) {
      return NextResponse.json({ error: 'Industry is required' }, { status: 400 })
    }

    // Check if already favorited
    const existing = await prisma.favoriteIndustry.findUnique({
      where: {
        userId_industry: {
          userId: session.user.id,
          industry,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'Industry already favorited' }, { status: 400 })
    }

    // Get max order
    const maxOrder = await prisma.favoriteIndustry.aggregate({
      where: { userId: session.user.id },
      _max: { order: true },
    })

    const favorite = await prisma.favoriteIndustry.create({
      data: {
        userId: session.user.id,
        industry,
        folderId: folderId || null,
        order: (maxOrder._max.order || 0) + 1,
      },
      include: {
        folder: true,
      },
    })

    return NextResponse.json(favorite, { status: 201 })
  } catch (error) {
    console.error('Create favorite industry error:', error)
    return NextResponse.json({ error: 'Failed to favorite industry' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { industry } = await request.json()

    if (!industry) {
      return NextResponse.json({ error: 'Industry is required' }, { status: 400 })
    }

    await prisma.favoriteIndustry.delete({
      where: {
        userId_industry: {
          userId: session.user.id,
          industry,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete favorite industry error:', error)
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 })
  }
}
