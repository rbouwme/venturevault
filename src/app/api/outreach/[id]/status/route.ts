import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateOutreachDraftStatus } from '@/services/user'
import type { OutreachStatus } from '@prisma/client'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const { status } = await request.json()

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const draft = await updateOutreachDraftStatus(
      session.user.id,
      id,
      status as OutreachStatus
    )
    return NextResponse.json(draft)
  } catch (error) {
    console.error('Update outreach status error:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
