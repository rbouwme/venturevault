'use client'

import { cn } from '@/lib/utils'

interface DashboardTabsProps {
  activeTab: 'funding' | 'browse'
  onTabChange: (tab: 'funding' | 'browse') => void
}

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        <button
          onClick={() => onTabChange('funding')}
          className={cn(
            'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium',
            activeTab === 'funding'
              ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          )}
        >
          Recent Funding
        </button>
        <button
          onClick={() => onTabChange('browse')}
          className={cn(
            'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium',
            activeTab === 'browse'
              ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          )}
        >
          Browse by Industry
        </button>
      </nav>
    </div>
  )
}
