import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProspects, createProspect } from '@/services/prospects'
import type { ProspectFilters } from '@/services/prospects'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const filters: ProspectFilters = {
      confidence: searchParams.get('confidence') as any,
      timeline: searchParams.get('timeline') || undefined,
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      signalType: searchParams.get('signalType') || undefined,
    }

    const prospects = await getProspects(session.user.id, filters)

    return NextResponse.json(prospects)
  } catch (error) {
    console.error('Error fetching prospects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prospects' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, priority, notes } = body

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const prospect = await createProspect({
      userId: session.user.id,
      companyId,
      source: 'MANUAL',
      priority: priority || 'MEDIUM',
    })

    // If notes were provided, create a note
    if (notes) {
      const { createProspectNote } = await import('@/services/prospects')
      await createProspectNote({
        prospectId: prospect.id,
        userId: session.user.id,
        content: notes,
        type: 'NOTE',
      })
    }

    return NextResponse.json(prospect, { status: 201 })
  } catch (error: any) {
    console.error('Error creating prospect:', error)

    if (error.message === 'Prospect already exists for this company') {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create prospect' },
      { status: 500 }
    )
  }
}
