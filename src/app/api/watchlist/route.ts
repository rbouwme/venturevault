import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { addToWatchlist, removeFromWatchlist, isCompanyWatchlisted } from '@/services/user'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { companyId, notes } = await request.json()

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    const exists = await isCompanyWatchlisted(session.user.id, companyId)
    if (exists) {
      return NextResponse.json({ error: 'Already in watchlist' }, { status: 400 })
    }

    const item = await addToWatchlist(session.user.id, companyId, notes)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Watchlist add error:', error)
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { companyId } = await request.json()

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    await removeFromWatchlist(session.user.id, companyId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Watchlist remove error:', error)
    return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (companyId) {
      const isWatchlisted = await isCompanyWatchlisted(session.user.id, companyId)
      return NextResponse.json({ isWatchlisted })
    }

    return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
  } catch (error) {
    console.error('Watchlist check error:', error)
    return NextResponse.json({ error: 'Failed to check watchlist' }, { status: 500 })
  }
}
