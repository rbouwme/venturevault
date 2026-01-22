import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runIngestion } from '@/ingestion'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { source } = await request.json()

    const result = await runIngestion(source)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Ingestion error:', error)
    return NextResponse.json(
      { error: 'Ingestion failed' },
      { status: 500 }
    )
  }
}
