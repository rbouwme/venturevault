import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllCredits } from '@/services/credits'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const credits = await getAllCredits()

    // Add configuration status for each provider
    const creditsWithConfig = credits.map((c) => {
      let configured = false
      if (c.provider === 'APOLLO') configured = !!process.env.APOLLO_API_KEY
      if (c.provider === 'HUNTER') configured = !!process.env.HUNTER_API_KEY
      if (c.provider === 'SNOVIO') configured = !!process.env.SNOVIO_API_KEY
      if (c.provider === 'NEWSAPI') configured = !!process.env.NEWSAPI_KEY

      return {
        ...c,
        configured,
      }
    })

    return NextResponse.json({ credits: creditsWithConfig })
  } catch (error) {
    console.error('Get credits error:', error)
    return NextResponse.json(
      { error: 'Failed to get credits' },
      { status: 500 }
    )
  }
}
