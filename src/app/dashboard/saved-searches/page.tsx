import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getSavedSearches } from '@/services/user'
import { SavedSearchesList } from '@/components/saved-searches/saved-searches-list'

export default async function SavedSearchesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const searches = await getSavedSearches(session.user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Saved Searches</h1>
        <p className="text-gray-600">
          Your saved filter combinations for quick access
        </p>
      </div>

      <SavedSearchesList searches={searches} />
    </div>
  )
}
