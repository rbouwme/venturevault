import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateSequence } from '@/ai/outreach'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { companyId, senderName, senderRole } = await request.json()

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    const sequence = await generateSequence(session.user.id, companyId, {
      senderName: senderName || undefined,
      senderRole: senderRole || undefined,
    })

    return NextResponse.json({ sequence })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate sequence'
    const status = message.includes('API key') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
