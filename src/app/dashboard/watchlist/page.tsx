import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getWatchlist } from '@/services/user'
import { WatchlistTable } from '@/components/watchlist/watchlist-table'

export default async function WatchlistPage({ searchParams }: { searchParams: Promise<{ country?: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const { country } = await searchParams
  const watchlist = await getWatchlist(session.user.id, country)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Watchlist</h1>
        <p className="text-muted-foreground">
          {country === 'CA' ? 'Canadian companies' : country === 'US' ? 'US companies' : 'Companies'} you are tracking
        </p>
      </div>

      <WatchlistTable items={watchlist} />
    </div>
  )
}
