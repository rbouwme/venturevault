import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateWatchlistNotes } from '@/services/user'

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { companyId, notes } = await request.json()

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    const item = await updateWatchlistNotes(session.user.id, companyId, notes || '')
    return NextResponse.json(item)
  } catch (error) {
    console.error('Watchlist notes update error:', error)
    return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 })
  }
}
