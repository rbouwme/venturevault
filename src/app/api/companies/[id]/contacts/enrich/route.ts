import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { enrichCompanyContacts } from '@/services/enrichment'
import { getRemainingCredits } from '@/services/credits'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: companyId } = await params
    const body = await request.json().catch(() => ({}))

    const departments = body.departments as string[] | undefined
    const seniorities = body.seniorities as string[] | undefined
    const limit = body.limit as number | undefined

    const result = await enrichCompanyContacts(companyId, {
      departments,
      seniorities,
      limit: limit || 10,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Get remaining credits after enrichment
    const remainingCredits = await getRemainingCredits('APOLLO')

    return NextResponse.json({
      ...result,
      remainingCredits,
    })
  } catch (error) {
    console.error('Enrich contacts error:', error)
    return NextResponse.json(
      { error: 'Failed to enrich contacts' },
      { status: 500 }
    )
  }
}
