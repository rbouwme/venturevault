import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createOutreachDraft } from '@/services/user'
import type { OutreachType } from '@/types/enums'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { companyId, type, subject, body } = await request.json()

    if (!companyId || !type || !body) {
      return NextResponse.json(
        { error: 'Company ID, type, and body are required' },
        { status: 400 }
      )
    }

    const draft = await createOutreachDraft(
      session.user.id,
      companyId,
      type as OutreachType,
      subject || null,
      body
    )

    return NextResponse.json(draft, { status: 201 })
  } catch (error) {
    console.error('Save outreach draft error:', error)
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
  }
}
