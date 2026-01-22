import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createSavedSearch, getSavedSearches } from '@/services/user'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searches = await getSavedSearches(session.user.id)
    return NextResponse.json(searches)
  } catch (error) {
    console.error('Get saved searches error:', error)
    return NextResponse.json({ error: 'Failed to get saved searches' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, filters } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const search = await createSavedSearch(session.user.id, name, filters || {})
    return NextResponse.json(search, { status: 201 })
  } catch (error) {
    console.error('Create saved search error:', error)
    return NextResponse.json({ error: 'Failed to create saved search' }, { status: 500 })
  }
}
