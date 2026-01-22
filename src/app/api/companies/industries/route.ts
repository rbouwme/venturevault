import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAvailableIndustries } from '@/services/yc-companies'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const industries = await getAvailableIndustries()
    return NextResponse.json({ industries })
  } catch (error) {
    console.error('Get industries error:', error)
    return NextResponse.json(
      { error: 'Failed to get industries' },
      { status: 500 }
    )
  }
}
