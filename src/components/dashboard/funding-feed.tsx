'use client'

import { useEffect, useState } from 'react'
import { FundingCard } from './funding-card'
import { Pagination } from './pagination'
import { Skeleton } from '@/components/ui/skeleton'
import type { FundingFilters } from '@/types'
import type { ColdEmailRecord } from './emailed-badge'

interface FundingFeedProps {
  filters: FundingFilters
}

interface FundingEvent {
  id: string
  companyId: string
  roundType: string
  amountCents: string | null
  announcedAt: string
  investors: string | null
  leadInvestor: string | null
  summary: string | null
  sourceUrl: string | null
  sourceName: string | null
  company: {
    id: string
    name: string
    domain: string | null
    description: string | null
    country: string | null
    state: string | null
    city: string | null
    logoUrl: string | null
    tags: string | null
    isHiring: boolean
  }
}

interface FundingResponse {
  events: FundingEvent[]
  totalCount: number
  totalPages: number
  currentPage: number
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg border border-border p-6 space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-32" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FundingFeed({ filters }: FundingFeedProps) {
  const [data, setData] = useState<FundingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emailedMap, setEmailedMap] = useState<Record<string, ColdEmailRecord>>({})

  useEffect(() => {
    async function fetchFundingEvents() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (filters.country) params.set('country', filters.country)
        if (filters.state) params.set('state', filters.state)
        if (filters.metro) params.set('metro', filters.metro)
        if (filters.city) params.set('city', filters.city)
        if (filters.headcount) params.set('headcount', filters.headcount)
        if (filters.industry) params.set('industry', filters.industry)
        if (filters.roundType) params.set('roundType', filters.roundType)
        if (filters.minAmount) params.set('minAmount', filters.minAmount.toString())
        if (filters.maxAmount) params.set('maxAmount', filters.maxAmount.toString())
        if (filters.hiringNow) params.set('hiringNow', 'true')
        if (filters.sortBy) params.set('sortBy', filters.sortBy)
        if (filters.page) params.set('page', filters.page.toString())
        if (filters.limit) params.set('limit', filters.limit.toString())
        if (filters.search) params.set('search', filters.search)

        const [fundingRes, emailsRes] = await Promise.all([
          fetch(`/api/funding?${params.toString()}`),
          fetch('/api/cold-emails'),
        ])

        if (!fundingRes.ok) throw new Error('Failed to fetch funding events')

        const result = await fundingRes.json()
        setData(result)

        if (emailsRes.ok) {
          const emails: Array<ColdEmailRecord & { company: { id: string } }> = await emailsRes.json()
          const map: Record<string, ColdEmailRecord> = {}
          for (const e of emails) {
            if (!map[e.company.id]) {
              map[e.company.id] = { id: e.id, emailAddress: e.emailAddress, sentAt: e.sentAt, followUpStatus: e.followUpStatus, notes: e.notes }
            }
          }
          setEmailedMap(map)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchFundingEvents()
  }, [filters])

  if (loading) {
    return <FeedSkeleton />
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <div className="text-4xl mb-4">❌</div>
        <h3 className="text-lg font-semibold text-foreground">Error loading startups</h3>
        <p className="mt-2 text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!data || data.events.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <div className="text-4xl mb-4">📭</div>
        <h3 className="text-lg font-semibold text-foreground">No startups found</h3>
        <p className="mt-2 text-muted-foreground">
          Try adjusting your filters or check back later for new companies.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {data.events.length} of {data.totalCount} startups
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.events.map((event) => (
          <FundingCard key={event.id} event={event} coldEmail={emailedMap[event.company.id]} />
        ))}
      </div>

      {data.totalPages > 1 && (
        <Pagination
          currentPage={data.currentPage}
          totalPages={data.totalPages}
          baseUrl="/dashboard"
          searchParams={filters}
        />
      )}
    </div>
  )
}
