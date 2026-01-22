'use client'

import { useState, Suspense } from 'react'
import { DashboardTabs } from './dashboard-tabs'
import { FundingFilters } from './funding-filters'
import { FundingFeed } from './funding-feed'
import { IndustryBrowser } from './industry-browser'
import { Skeleton } from '@/components/ui/skeleton'
import type { FundingFilters as Filters } from '@/types'

interface DashboardContentProps {
  filters: Filters
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-6 space-y-4">
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

export function DashboardContent({ filters }: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState<'funding' | 'browse'>('funding')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Startup Discovery</h1>
        <p className="text-gray-600">
          Find recently funded startups or browse by industry
        </p>
      </div>

      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'funding' ? (
        <>
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <FundingFilters />
          </Suspense>

          <Suspense fallback={<FeedSkeleton />}>
            <FundingFeed filters={filters} />
          </Suspense>
        </>
      ) : (
        <Suspense fallback={<FeedSkeleton />}>
          <IndustryBrowser />
        </Suspense>
      )}
    </div>
  )
}
