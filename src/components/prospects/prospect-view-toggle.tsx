'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { LayoutListIcon, LayoutGridIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProspectViewToggleProps {
  currentView: 'list' | 'kanban'
}

export function ProspectViewToggle({ currentView }: ProspectViewToggleProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setView(view: 'list' | 'kanban') {
    const params = new URLSearchParams(searchParams.toString())
    if (view === 'list') {
      params.delete('view')
    } else {
      params.set('view', view)
    }
    router.push(`/dashboard/prospects?${params.toString()}`)
  }

  return (
    <div className="flex items-center border border-border rounded-md overflow-hidden">
      <button
        onClick={() => setView('list')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors',
          currentView === 'list'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent'
        )}
        title="List view"
      >
        <LayoutListIcon className="h-3.5 w-3.5" />
        List
      </button>
      <button
        onClick={() => setView('kanban')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-border',
          currentView === 'kanban'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent'
        )}
        title="Kanban view"
      >
        <LayoutGridIcon className="h-3.5 w-3.5" />
        Kanban
      </button>
    </div>
  )
}
