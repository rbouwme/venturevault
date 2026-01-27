import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { convertProspect } from '@/services/prospects'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prospect = await convertProspect(session.user.id, params.id)

    return NextResponse.json({
      success: true,
      prospect,
    })
  } catch (error: any) {
    console.error('Error converting prospect:', error)

    if (error.message === 'Prospect not found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to convert prospect' },
      { status: 500 }
    )
  }
}
