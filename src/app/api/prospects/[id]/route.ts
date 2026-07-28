import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateProspect, archiveProspect, getProspectById } from '@/services/prospects'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const prospect = await getProspectById(session.user.id, id)

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    return NextResponse.json(prospect)
  } catch (error) {
    console.error('Error fetching prospect:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prospect' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      status,
      priority,
      nextAction,
      nextActionDate,
      lastContactedAt,
    } = body

    const updateData: any = {}

    if (status) updateData.status = status
    if (priority) updateData.priority = priority
    if (nextAction !== undefined) updateData.nextAction = nextAction
    if (nextActionDate !== undefined) {
      updateData.nextActionDate = nextActionDate ? new Date(nextActionDate) : null
    }
    if (lastContactedAt !== undefined) {
      updateData.lastContactedAt = lastContactedAt ? new Date(lastContactedAt) : null
    }

    const prospect = await updateProspect(session.user.id, id, updateData)

    return NextResponse.json(prospect)
  } catch (error: any) {
    console.error('Error updating prospect:', error)

    if (error.message === 'Prospect not found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to update prospect' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await archiveProspect(session.user.id, id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error archiving prospect:', error)

    if (error.message === 'Prospect not found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to archive prospect' },
      { status: 500 }
    )
  }
}
