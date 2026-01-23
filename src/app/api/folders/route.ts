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
    const folders = await prisma.folder.findMany({
      where: { userId: session.user.id },
      orderBy: { order: 'asc' },
      include: {
        industries: {
          orderBy: { order: 'asc' },
        },
      },
    })
    return NextResponse.json(folders)
  } catch (error) {
    console.error('Get folders error:', error)
    return NextResponse.json({ error: 'Failed to get folders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, color, icon } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Get max order for new folder
    const maxOrder = await prisma.folder.aggregate({
      where: { userId: session.user.id },
      _max: { order: true },
    })

    const folder = await prisma.folder.create({
      data: {
        userId: session.user.id,
        name,
        color: color || '#6366f1',
        icon: icon || 'folder',
        order: (maxOrder._max.order || 0) + 1,
      },
    })

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Create folder error:', error)
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
  }
}
