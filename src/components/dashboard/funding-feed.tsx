import { getFundingEvents, getFundingEventsCount } from '@/services/funding'
import { FundingCard } from './funding-card'
import { Pagination } from './pagination'
import type { FundingFilters } from '@/types'

interface FundingFeedProps {
  filters: FundingFilters
}

export async function FundingFeed({ filters }: FundingFeedProps) {
  const [events, totalCount] = await Promise.all([
    getFundingEvents(filters),
    getFundingEventsCount(filters),
  ])

  const totalPages = Math.ceil(totalCount / (filters.limit || 20))
  const currentPage = filters.page || 1

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <div className="text-4xl mb-4">📭</div>
        <h3 className="text-lg font-semibold text-gray-900">No funding events found</h3>
        <p className="mt-2 text-gray-600">
          Try adjusting your filters or check back later for new announcements.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {events.length} of {totalCount} funding events
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {events.map((event) => (
          <FundingCard key={event.id} event={event} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl="/dashboard"
          searchParams={filters}
        />
      )}
    </div>
  )
}
