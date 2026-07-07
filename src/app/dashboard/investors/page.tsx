import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { InvestorTable } from '@/components/investors/investor-table'

export default async function InvestorsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/auth/signin')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Investor Activity</h1>
        <p className="text-muted-foreground">
          Most active VCs and investors based on recent funding rounds
        </p>
      </div>
      <InvestorTable />
    </div>
  )
}
