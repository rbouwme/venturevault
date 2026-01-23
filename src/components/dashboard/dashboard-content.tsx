'use client'

import { useState } from 'react'
import { DashboardTabs } from './dashboard-tabs'
import { FundingFilters } from './funding-filters'
import { FundingFeed } from './funding-feed'
import { IndustryBrowser } from './industry-browser'
import type { FundingFilters as Filters } from '@/types'

interface DashboardContentProps {
  filters: Filters
}

export function DashboardContent({ filters }: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState<'funding' | 'browse'>('funding')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Startup Discovery</h1>
        <p className="text-muted-foreground">
          Find recently funded startups or browse by industry
        </p>
      </div>

      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'funding' ? (
        <>
          <FundingFilters />
          <FundingFeed filters={filters} />
        </>
      ) : (
        <IndustryBrowser />
      )}
    </div>
  )
}
