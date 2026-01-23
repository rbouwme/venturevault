import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const { folderId, order } = await request.json()

    const favorite = await prisma.favoriteIndustry.update({
      where: { id, userId: session.user.id },
      data: {
        ...(folderId !== undefined && { folderId }),
        ...(order !== undefined && { order }),
      },
      include: {
        folder: true,
      },
    })

    return NextResponse.json(favorite)
  } catch (error) {
    console.error('Update favorite industry error:', error)
    return NextResponse.json({ error: 'Failed to update favorite' }, { status: 500 })
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
    await prisma.favoriteIndustry.delete({
      where: { id, userId: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete favorite industry error:', error)
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 })
  }
}
