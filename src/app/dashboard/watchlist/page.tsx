import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getWatchlist } from '@/services/user'
import { WatchlistTable } from '@/components/watchlist/watchlist-table'

export default async function WatchlistPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const watchlist = await getWatchlist(session.user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Watchlist</h1>
        <p className="text-gray-600">
          Companies you are tracking
        </p>
      </div>

      <WatchlistTable items={watchlist} />
    </div>
  )
}
