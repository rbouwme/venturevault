import { NextResponse } from 'next/server'
import { runIngestion } from '@/ingestion'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runIngestion()

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Cron ingestion error:', error)
    return NextResponse.json(
      { error: 'Ingestion failed' },
      { status: 500 }
    )
  }
}
