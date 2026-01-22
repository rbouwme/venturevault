import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getOutreachDrafts } from '@/services/user'
import { OutreachTable } from '@/components/outreach/outreach-table'

export default async function OutreachPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const drafts = await getOutreachDrafts(session.user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Outreach</h1>
        <p className="text-gray-600">
          Track your outreach drafts and their status
        </p>
      </div>

      <OutreachTable drafts={drafts} />
    </div>
  )
}
