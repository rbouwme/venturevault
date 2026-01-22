import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCompanyContacts, getCompanyContactCount } from '@/services/enrichment'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: companyId } = await params
    const { searchParams } = new URL(request.url)

    const department = searchParams.get('department') || undefined
    const seniority = searchParams.get('seniority') || undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0

    const [contacts, total] = await Promise.all([
      getCompanyContacts(companyId, { department, seniority, limit, offset }),
      getCompanyContactCount(companyId),
    ])

    return NextResponse.json({
      contacts,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Get contacts error:', error)
    return NextResponse.json(
      { error: 'Failed to get contacts' },
      { status: 500 }
    )
  }
}
