import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCompaniesByIndustry, getAvailableIndustries } from '@/services/yc-companies'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)

    const industry = searchParams.get('industry') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const hiringOnly = searchParams.get('hiringOnly') === 'true'
    const ycOnly = searchParams.get('ycOnly') !== 'false' // Default to true

    const { companies, total } = await getCompaniesByIndustry(industry, {
      limit,
      offset,
      hiringOnly,
      ycOnly,
    })

    return NextResponse.json({
      companies,
      total,
      limit,
      offset,
      hasMore: offset + companies.length < total,
    })
  } catch (error) {
    console.error('Browse companies error:', error)
    return NextResponse.json(
      { error: 'Failed to browse companies' },
      { status: 500 }
    )
  }
}
