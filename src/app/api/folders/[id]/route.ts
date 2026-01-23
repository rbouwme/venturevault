import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const folder = await prisma.folder.findUnique({
      where: { id, userId: session.user.id },
      include: {
        industries: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    return NextResponse.json(folder)
  } catch (error) {
    console.error('Get folder error:', error)
    return NextResponse.json({ error: 'Failed to get folder' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, color, icon, order } = await request.json()

    const folder = await prisma.folder.update({
      where: { id, userId: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(order !== undefined && { order }),
      },
    })

    return NextResponse.json(folder)
  } catch (error) {
    console.error('Update folder error:', error)
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.folder.delete({
      where: { id, userId: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete folder error:', error)
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 })
  }
}
