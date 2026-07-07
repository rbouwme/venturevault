'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface InvestorEntry {
  name: string
  dealCount: number
  leadCount: number
  totalRaisedM: number
  rounds: Record<string, number>
  recentDeal: string
  portfolioCompanies: { id: string; name: string }[]
}

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`
  if (n >= 1) return `$${n.toFixed(0)}M`
  return `$${(n * 1000).toFixed(0)}K`
}

function topRound(rounds: Record<string, number>) {
  return Object.entries(rounds)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([r]) => r.replace(/_/g, ' '))
    .join(', ')
}

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d === 0) return 'today'
  if (d === 1) return '1d ago'
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

export function InvestorTable() {
  const [investors, setInvestors] = useState<InvestorEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(90)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/investors?days=${days}`)
      .then((r) => r.json())
      .then((d) => { setInvestors(d.investors || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days])

  const filtered = investors.filter((inv) =>
    inv.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search investors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-border rounded-md px-3 py-1.5 text-sm bg-background w-56"
        />
        <div className="flex items-center gap-1.5">
          {[30, 60, 90, 180].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                days === d
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground">No investor data found for this period.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Investor data is extracted from funding round announcements. Try a longer time range.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 px-4 py-2 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <div className="col-span-4">Investor</div>
            <div className="col-span-2 text-right">Deals</div>
            <div className="col-span-2 text-right">Led</div>
            <div className="col-span-2 text-right">Raised</div>
            <div className="col-span-2 text-right">Last Deal</div>
          </div>

          {filtered.map((inv) => (
            <div key={inv.name}>
              <button
                className="w-full grid grid-cols-12 px-4 py-3 hover:bg-accent/40 transition-colors text-left"
                onClick={() => setExpanded(expanded === inv.name ? null : inv.name)}
              >
                <div className="col-span-4">
                  <p className="text-sm font-medium text-foreground">{inv.name}</p>
                  <p className="text-xs text-muted-foreground">{topRound(inv.rounds)}</p>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-sm font-semibold text-foreground">{inv.dealCount}</p>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-sm text-foreground">{inv.leadCount}</p>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-sm text-foreground">
                    {inv.totalRaisedM > 0 ? fmt(inv.totalRaisedM) : '—'}
                  </p>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-xs text-muted-foreground">{daysAgo(inv.recentDeal)}</p>
                </div>
              </button>

              {expanded === inv.name && inv.portfolioCompanies.length > 0 && (
                <div className="px-4 pb-3 bg-muted/20 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-2 mb-1.5">
                    Recent Portfolio Companies
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {inv.portfolioCompanies.map((c) => (
                      <Link
                        key={c.id}
                        href={`/dashboard/companies/${c.id}`}
                        className="text-xs px-2 py-0.5 bg-card border border-border rounded-full text-primary hover:bg-accent transition-colors"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
