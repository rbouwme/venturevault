'use client'

import { cn } from '@/lib/utils'

interface DashboardTabsProps {
  activeTab: 'funding' | 'browse'
  onTabChange: (tab: 'funding' | 'browse') => void
}

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        <button
          onClick={() => onTabChange('funding')}
          className={cn(
            'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium',
            activeTab === 'funding'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          )}
        >
          Recent Funding
        </button>
        <button
          onClick={() => onTabChange('browse')}
          className={cn(
            'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium',
            activeTab === 'browse'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          )}
        >
          Browse by Industry
        </button>
      </nav>
    </div>
  )
}
