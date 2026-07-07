import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getOutreachDrafts } from '@/services/user'
import { prisma } from '@/lib/prisma'
import { OutreachTable } from '@/components/outreach/outreach-table'
import { SequenceGenerator } from '@/components/outreach/sequence-generator'

export default async function OutreachPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/auth/signin')

  const [drafts, watchlistCompanies] = await Promise.all([
    getOutreachDrafts(session.user.id),
    prisma.watchlist.findMany({
      where: { userId: session.user.id },
      include: { company: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const companies = watchlistCompanies.map((w) => w.company)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Outreach</h1>
        <p className="text-muted-foreground">
          Track drafts and generate personalized email sequences
        </p>
      </div>

      <SequenceGenerator companies={companies} />

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Saved Drafts</h2>
        <OutreachTable drafts={drafts} />
      </div>
    </div>
  )
}
