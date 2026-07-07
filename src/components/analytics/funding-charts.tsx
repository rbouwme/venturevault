'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'

interface WeeklyPoint { week: string; count: number; totalM: number }
interface RoundPoint { roundType: string; count: number; totalM: number }
interface IndustryPoint { industry: string; count: number }
interface Stats { totalDeals: number; totalRaisedM: number; avgDealM: number; withAmountCount: number }

interface AnalyticsData {
  weeklyVolume: WeeklyPoint[]
  byRoundType: RoundPoint[]
  byIndustry: IndustryPoint[]
  stats: Stats
}

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`
  if (n >= 1) return `$${n.toFixed(0)}M`
  return `$${(n * 1000).toFixed(0)}K`
}

function fmtWeek(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function roundLabel(rt: string) {
  return rt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899']

interface FundingChartsProps {
  country?: string
  days?: number
}

export function FundingCharts({ country, days = 90 }: FundingChartsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeDays, setActiveDays] = useState(days)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ days: String(activeDays) })
    if (country) params.set('country', country)
    fetch(`/api/analytics?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activeDays, country])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-6 h-48 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data) return <p className="text-muted-foreground">Failed to load analytics.</p>

  const { stats, weeklyVolume, byRoundType, byIndustry } = data

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex items-center gap-2">
        {[30, 60, 90, 180].map((d) => (
          <button
            key={d}
            onClick={() => setActiveDays(d)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              activeDays === d
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-accent'
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Total Deals</p>
          <p className="text-2xl font-bold">{stats.totalDeals.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Total Raised</p>
          <p className="text-2xl font-bold">{fmt(stats.totalRaisedM)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Avg Deal Size</p>
          <p className="text-2xl font-bold">{fmt(stats.avgDealM)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Deals w/ Amount</p>
          <p className="text-2xl font-bold">
            {stats.totalDeals > 0
              ? `${((stats.withAmountCount / stats.totalDeals) * 100).toFixed(0)}%`
              : '—'}
          </p>
        </div>
      </div>

      {/* Weekly volume */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-4">Weekly Deal Volume</h3>
        {weeklyVolume.length === 0 ? (
          <p className="text-muted-foreground text-sm">No data for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyVolume} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="week"
                tickFormatter={fmtWeek}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any, name: any) =>
                  name === 'totalM' ? [fmt(Number(v)), 'Raised'] : [v, 'Deals']
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={(label: any) => fmtWeek(String(label))}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend formatter={(v) => (v === 'count' ? 'Deals' : 'Raised ($M)')} iconSize={10} />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="totalM" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By round type */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-4">Deals by Round Type</h3>
          {byRoundType.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byRoundType} layout="vertical" margin={{ left: 4, right: 16 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="roundType"
                  type="category"
                  tickFormatter={roundLabel}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [v, 'Deals']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By industry */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-4">Top Industries</h3>
          {byIndustry.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tag data available.</p>
          ) : (
            <div className="space-y-2">
              {byIndustry.map((item, i) => {
                const max = byIndustry[0].count
                return (
                  <div key={item.industry} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium truncate">{item.industry}</span>
                        <span className="text-xs text-muted-foreground ml-2">{item.count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${(item.count / max) * 100}%`,
                            backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
