'use client'

import { useState } from 'react'
import Link from 'next/link'

const COLUMNS = [
  { key: 'NEW', label: 'New', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { key: 'CONTACTED', label: 'Contacted', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { key: 'RESPONDED', label: 'Responded', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  { key: 'QUALIFIED', label: 'Qualified', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  { key: 'DISQUALIFIED', label: 'Disqualified', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
]

interface Prospect {
  id: string
  status: string
  priority: string
  confidenceScore: number
  timelinePrediction: string | null
  company: {
    id: string
    name: string
    city: string | null
    state: string | null
    country: string | null
  }
  signals: { id: string; type: string }[]
}

const SIGNAL_EMOJIS: Record<string, string> = {
  FUNDING_PATTERN: '💰',
  HIRING_SPIKE: '📈',
  HEADCOUNT_GROWTH: '👥',
  JOB_VELOCITY: '⚡',
  NEWS_MENTION: '📰',
}

function scoreColor(score: number) {
  if (score >= 0.7) return 'text-green-600 dark:text-green-400'
  if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-500 dark:text-red-400'
}

interface KanbanCardProps {
  prospect: Prospect
  onMove: (id: string, status: string) => void
}

function KanbanCard({ prospect, onMove }: KanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = [prospect.company.city, prospect.company.state].filter(Boolean).join(', ')

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-1.5 shadow-sm">
      <Link
        href={`/dashboard/companies/${prospect.company.id}`}
        className="text-[13px] font-semibold text-foreground hover:text-primary transition-colors block"
      >
        {prospect.company.name}
      </Link>

      {location && (
        <p className="text-[11px] text-muted-foreground">{location}</p>
      )}

      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-semibold ${scoreColor(prospect.confidenceScore)}`}>
          {(prospect.confidenceScore * 100).toFixed(0)}%
        </span>
        <span className="text-xs text-muted-foreground">confidence</span>
      </div>

      {prospect.signals.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {prospect.signals.slice(0, 3).map((s) => (
            <span key={s.id} className="text-[10px]" title={s.type}>
              {SIGNAL_EMOJIS[s.type] || '•'}
            </span>
          ))}
        </div>
      )}

      <div className="relative pt-1">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="text-[11px] text-muted-foreground hover:text-foreground underline"
        >
          Move to stage
        </button>
        {menuOpen && (
          <div className="absolute bottom-6 left-0 z-20 bg-card border border-border rounded-md shadow-lg py-1 min-w-[140px]">
            {COLUMNS.filter((c) => c.key !== prospect.status).map((c) => (
              <button
                key={c.key}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                onClick={() => { onMove(prospect.id, c.key); setMenuOpen(false) }}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ProspectKanbanProps {
  prospects: Prospect[]
}

export function ProspectKanban({ prospects: initial }: ProspectKanbanProps) {
  const [prospects, setProspects] = useState(initial)

  async function handleMove(id: string, status: string) {
    const res = await fetch(`/api/prospects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setProspects((prev) => prev.map((p) => p.id === id ? { ...p, status } : p))
    }
  }

  const byStatus = COLUMNS.reduce<Record<string, Prospect[]>>((acc, col) => {
    acc[col.key] = prospects.filter((p) => p.status === col.key)
    return acc
  }, {})

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const cards = byStatus[col.key] || []
        return (
          <div key={col.key} className="min-w-[160px]">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${col.color}`}>
                {col.label}
              </span>
              <span className="text-xs text-muted-foreground font-medium">{cards.length}</span>
            </div>
            <div className="space-y-2">
              {cards.map((p) => (
                <KanbanCard key={p.id} prospect={p} onMove={handleMove} />
              ))}
              {cards.length === 0 && (
                <div className="border-2 border-dashed border-border rounded-lg h-16 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Empty</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
