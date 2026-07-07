import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProspects } from '@/services/prospects'

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prospects = await getProspects(session.user.id)

    const headers = [
      'Company',
      'Domain',
      'Location',
      'Confidence',
      'Timeline',
      'Status',
      'Priority',
      'Signals Detected',
      'Added Date',
    ]

    const rows = prospects.map((p) => [
      p.company.name,
      p.company.domain || '',
      [p.company.city, p.company.state, p.company.country].filter(Boolean).join(', '),
      `${(p.confidenceScore * 100).toFixed(0)}%`,
      p.timelinePrediction?.replace(/_/g, ' ') || '',
      p.status,
      p.priority,
      p.signals.map((s) => s.type).join('; '),
      new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(String(cell))).join(','))
      .join('\n')

    const filename = `prospects-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting prospects:', error)
    return NextResponse.json({ error: 'Failed to export prospects' }, { status: 500 })
  }
}
