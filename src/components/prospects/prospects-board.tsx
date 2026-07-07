'use client'

import { useState } from 'react'
import Link from 'next/link'

const COLUMNS = [
  { status: 'NEW', label: 'New', topColor: 'border-t-blue-400' },
  { status: 'CONTACTED', label: 'Contacted', topColor: 'border-t-yellow-400' },
  { status: 'RESPONDED', label: 'Responded', topColor: 'border-t-purple-400' },
  { status: 'QUALIFIED', label: 'Qualified', topColor: 'border-t-orange-400' },
  { status: 'CONVERTED', label: 'Converted ✓', topColor: 'border-t-green-400' },
]

function scoreColor(score: number) {
  if (score >= 0.7) return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
  if (score >= 0.4) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
  return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
}

interface BoardProspect {
  id: string
  confidenceScore: number
  status: string
  priority: string
  company: {
    id: string
    name: string
    domain: string | null
    description: string | null
  }
}

interface ProspectsBoardProps {
  prospects: BoardProspect[]
}

export function ProspectsBoard({ prospects: initial }: ProspectsBoardProps) {
  const [prospects, setProspects] = useState(initial)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  async function moveProspect(id: string, newStatus: string) {
    const oldStatus = prospects.find(p => p.id === id)?.status
    setProspects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed')
    } catch {
      if (oldStatus) {
        setProspects(prev => prev.map(p => p.id === id ? { ...p, status: oldStatus } : p))
      }
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUMNS.map(col => {
        const cards = prospects.filter(p => p.status === col.status)
        const isOver = dragOver === col.status
        return (
          <div
            key={col.status}
            className={`flex-shrink-0 w-60 rounded-lg border border-border border-t-4 ${col.topColor} bg-muted/30 transition-all ${
              isOver ? 'ring-2 ring-primary ring-offset-1' : ''
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.status) }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOver(null)
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(null)
              if (dragging) moveProspect(dragging, col.status)
            }}
          >
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{col.label}</span>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {cards.length}
                </span>
              </div>
            </div>
            <div className="p-2 space-y-2 min-h-[180px]">
              {cards.map(p => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => {
                    setDragging(p.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => { setDragging(null); setDragOver(null) }}
                  className={`bg-card border border-border rounded-md p-3 cursor-grab active:cursor-grabbing select-none transition-opacity hover:shadow-sm ${
                    dragging === p.id ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  <Link
                    href={`/dashboard/companies/${p.company.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors block leading-tight"
                    onClick={(e) => { if (dragging) e.preventDefault() }}
                  >
                    {p.company.name}
                  </Link>
                  {(p.company.description || p.company.domain) && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {p.company.description || p.company.domain}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${scoreColor(p.confidenceScore)}`}>
                      {(p.confidenceScore * 100).toFixed(0)}%
                    </span>
                    <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground capitalize">
                      {p.priority.toLowerCase()}
                    </span>
                  </div>
                </div>
              ))}
              {cards.length === 0 && (
                <div className={`flex items-center justify-center h-16 rounded-md text-xs text-muted-foreground border-2 border-dashed transition-colors ${
                  isOver ? 'border-primary/40 bg-primary/5 text-primary' : 'border-transparent'
                }`}>
                  {isOver ? 'Drop here' : 'Empty'}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
