import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { FundingCharts } from '@/components/analytics/funding-charts'

interface PageProps {
  searchParams: Promise<{ country?: string }>
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/auth/signin')

  const { country } = await searchParams

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Funding Trends</h1>
        <p className="text-muted-foreground">
          Deal volume, round types, and top industries over time
        </p>
      </div>
      <FundingCharts country={country} />
    </div>
  )
}
