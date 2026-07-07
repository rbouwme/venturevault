import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emails = await prisma.coldEmail.findMany({
      where: { userId: session.user.id },
      include: {
        company: {
          select: { name: true, domain: true, city: true, state: true, country: true },
        },
      },
      orderBy: { sentAt: 'desc' },
    })

    const headers = [
      'Company',
      'Domain',
      'Location',
      'Email Address',
      'Sent Date',
      'Status',
      'Notes',
    ]

    const rows = emails.map((e) => [
      e.company.name,
      e.company.domain || '',
      [e.company.city, e.company.state, e.company.country].filter(Boolean).join(', '),
      e.emailAddress,
      new Date(e.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      e.followUpStatus,
      e.notes || '',
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(String(cell))).join(','))
      .join('\n')

    const filename = `cold-emails-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting cold emails:', error)
    return NextResponse.json({ error: 'Failed to export cold emails' }, { status: 500 })
  }
}
