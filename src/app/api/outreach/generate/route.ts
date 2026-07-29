import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateOutreach } from '@/ai/outreach'
import type { OutreachType } from '@/types/enums'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { companyId, type } = await request.json()

    if (!companyId || !type) {
      return NextResponse.json(
        { error: 'Company ID and type are required' },
        { status: 400 }
      )
    }

    const draft = await generateOutreach(
      session.user.id,
      companyId,
      type as OutreachType
    )

    return NextResponse.json({ draft })
  } catch (error) {
    console.error('Generate outreach error:', error)

    const message = error instanceof Error ? error.message : 'Failed to generate outreach'

    if (message.includes('API key')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
