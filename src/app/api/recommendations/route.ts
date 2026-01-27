import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getRecommendations,
  markRecommendationViewed,
  markRecommendationClicked,
} from '@/services/recommendations'

/**
 * GET /api/recommendations
 * Fetch recommendations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    if (limit < 1 || limit > 20) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 20' },
        { status: 400 }
      )
    }

    const recommendations = await getRecommendations(session.user.id, limit)

    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/recommendations
 * Track user interaction (view or click)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, action } = body

    if (!companyId || typeof companyId !== 'string') {
      return NextResponse.json(
        { error: 'companyId is required and must be a string' },
        { status: 400 }
      )
    }

    if (!action || !['view', 'click'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be either "view" or "click"' },
        { status: 400 }
      )
    }

    if (action === 'view') {
      await markRecommendationViewed(session.user.id, companyId)
    } else {
      await markRecommendationClicked(session.user.id, companyId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking recommendation interaction:', error)
    return NextResponse.json(
      { error: 'Failed to track interaction' },
      { status: 500 }
    )
  }
}
