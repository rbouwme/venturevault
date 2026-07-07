'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BellIcon, ChevronDownIcon, ChevronUpIcon, InfoIcon, TrendingUpIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ── Signal config ────────────────────────────────────────────────────────────

const SIGNAL_WEIGHTS: Record<string, number> = {
  FUNDING_PATTERN: 0.40,
  HIRING_SPIKE: 0.25,
  HEADCOUNT_GROWTH: 0.15,
  JOB_VELOCITY: 0.10,
  NEWS_MENTION: 0.10,
}

const ALL_SIGNAL_TYPES = [
  'FUNDING_PATTERN',
  'HIRING_SPIKE',
  'HEADCOUNT_GROWTH',
  'JOB_VELOCITY',
  'NEWS_MENTION',
] as const

const SIGNAL_LABELS: Record<string, string> = {
  FUNDING_PATTERN: 'Funding Pattern',
  HIRING_SPIKE: 'Hiring Spike',
  HEADCOUNT_GROWTH: 'Headcount Growth',
  JOB_VELOCITY: 'Job Velocity',
  NEWS_MENTION: 'News Mention',
}

const SIGNAL_EMOJIS: Record<string, string> = {
  FUNDING_PATTERN: '💰',
  HIRING_SPIKE: '📈',
  HEADCOUNT_GROWTH: '👥',
  JOB_VELOCITY: '⚡',
  NEWS_MENTION: '📰',
}

// Specific "why not detected" messages — use actual company data where possible
function notDetectedReason(type: string, headcount: number | null): string {
  switch (type) {
    case 'FUNDING_PATTERN':
      return 'No funding events found in the 8–24 month sweet spot for predicting the next round'
    case 'HIRING_SPIKE':
      return 'Fewer than 5 postings in the last 7 days and fewer than 10 in the last 30 days'
    case 'HEADCOUNT_GROWTH':
      return headcount != null
        ? `Hiring rate below 10% of current ${headcount} employees (needs ${Math.ceil(headcount * 0.1)}+ open roles)`
        : 'No headcount data on file — add this to enable the signal'
    case 'JOB_VELOCITY':
      return 'Fewer than 3 postings per week over 4+ consecutive weeks'
    case 'NEWS_MENTION':
      return 'No recent press coverage detected'
    default:
      return 'Signal not detected'
  }
}

// Concrete unlock hints for undetected signals
function unlockHint(type: string, headcount: number | null): string {
  const max = (SIGNAL_WEIGHTS[type] * 100).toFixed(0)
  switch (type) {
    case 'FUNDING_PATTERN':
      return `Activates automatically 8–24 months after the last funding round → up to +${max}%`
    case 'HIRING_SPIKE':
      return `Post 5+ jobs within any 7-day window → up to +${max}%`
    case 'HEADCOUNT_GROWTH':
      return headcount != null
        ? `Post ${Math.ceil(headcount * 0.1)}+ open roles (10% of ${headcount} employees) → up to +${max}%`
        : `Add headcount data then post ≥10% of that workforce as open roles → up to +${max}%`
    case 'JOB_VELOCITY':
      return `Post 3+ jobs/week consistently for 4 consecutive weeks → up to +${max}%`
    case 'NEWS_MENTION':
      return `Earn press coverage that gets picked up by our news sources → up to +${max}%`
    default:
      return ''
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface ProspectSignal {
  id: string
  type: string
  strength: number
  description: string | null
  metadata: string | null
  detectedAt: string | Date
}

interface ProspectCardProps {
  prospect: {
    id: string
    confidenceScore: number
    timelinePrediction: string | null
    status: string
    priority: string
    source: string
    signals: ProspectSignal[]
    company: {
      id: string
      name: string
      domain: string | null
      description: string | null
      city: string | null
      state: string | null
      country: string | null
      headcount: number | null
      ycBatch: string | null
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 0.7) return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
  if (score >= 0.4) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
  return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
}

function barColor(strength: number) {
  if (strength >= 0.7) return 'bg-green-500'
  if (strength >= 0.4) return 'bg-yellow-500'
  return 'bg-orange-400'
}

function formatTimeline(t: string | null) {
  if (!t) return null
  return t.replace(/_/g, ' ').replace('MONTHS', 'months').replace('PLUS', '+').toLowerCase()
}

function parseMetadata(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

function formatAmount(cents: string | null | undefined): string | null {
  if (!cents) return null
  const n = Number(cents) / 100
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function timeAgo(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime()
  const days = Math.floor(ms / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`
}

function MetadataDetail({ type, meta }: { type: string; meta: Record<string, unknown> }) {
  if (type === 'FUNDING_PATTERN') {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {meta.lastRound && <span>Last round: <strong>{String(meta.lastRound)}</strong></span>}
        {meta.monthsSince != null && (
          <span>
            Months since: <strong>{String(meta.monthsSince)}</strong>
            <span className="text-muted-foreground/60 ml-1">(sweet spot: 12–18)</span>
          </span>
        )}
        {meta.lastAmount && <span>Raised: <strong>{formatAmount(String(meta.lastAmount))}</strong></span>}
      </div>
    )
  }
  if (type === 'HIRING_SPIKE') {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {meta.jobsLast7Days != null && (
          <span>Last 7 days: <strong>{String(meta.jobsLast7Days)} jobs</strong> <span className="text-muted-foreground/60">(threshold: 5)</span></span>
        )}
        {meta.jobsLast30Days != null && <span>Last 30 days: <strong>{String(meta.jobsLast30Days)} jobs</strong></span>}
      </div>
    )
  }
  if (type === 'JOB_VELOCITY') {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {meta.avgJobsPerWeek != null && (
          <span>Avg/week: <strong>{String(meta.avgJobsPerWeek)}</strong> <span className="text-muted-foreground/60">(threshold: 3)</span></span>
        )}
        {meta.weeksActive != null && <span>Active weeks: <strong>{String(meta.weeksActive)}</strong></span>}
        {meta.totalJobs != null && <span>Total jobs: <strong>{String(meta.totalJobs)}</strong></span>}
      </div>
    )
  }
  if (type === 'HEADCOUNT_GROWTH') {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {meta.currentHeadcount != null && <span>Headcount: <strong>{String(meta.currentHeadcount)}</strong></span>}
        {meta.recentOpenings != null && <span>Open roles: <strong>{String(meta.recentOpenings)}</strong></span>}
        {meta.growthRate != null && (
          <span>Hiring rate: <strong>{(Number(meta.growthRate) * 100).toFixed(0)}%</strong> <span className="text-muted-foreground/60">(threshold: 10%)</span></span>
        )}
      </div>
    )
  }
  return null
}

// ── Main component ───────────────────────────────────────────────────────────

export function ProspectCard({ prospect }: ProspectCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminderDate, setReminderDate] = useState('')
  const [reminderContent, setReminderContent] = useState('')
  const [reminderSaving, setReminderSaving] = useState(false)
  const [reminderSaved, setReminderSaved] = useState(false)

  async function saveReminder() {
    if (!reminderDate) return
    setReminderSaving(true)
    try {
      const defaultContent = `Follow up on ${new Date(reminderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      await fetch(`/api/prospects/${prospect.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: reminderContent.trim() || defaultContent,
          type: 'REMINDER',
          reminderDate: new Date(reminderDate).toISOString(),
        }),
      })
      setReminderSaved(true)
      setTimeout(() => {
        setReminderOpen(false)
        setReminderDate('')
        setReminderContent('')
        setReminderSaved(false)
      }, 1000)
    } catch {
      // ignore
    } finally {
      setReminderSaving(false)
    }
  }

  const { company, signals, confidenceScore } = prospect

  // Build a map of detected signals by type
  const detectedByType: Record<string, ProspectSignal> = {}
  for (const s of signals) {
    detectedByType[s.type] = s
  }

  // #1 — Normalization: figure out how many signals were detectable vs total
  const activeWeightSum = signals.reduce((sum, s) => sum + (SIGNAL_WEIGHTS[s.type] ?? 0), 0)
  const isNormalized = activeWeightSum > 0 && activeWeightSum < 0.99
  const effectiveDivisor = isNormalized ? activeWeightSum : 1.0

  function contribution(signal: ProspectSignal): number {
    const w = SIGNAL_WEIGHTS[signal.type] ?? 0
    return (signal.strength * w) / effectiveDivisor
  }

  // Sort detected signals first, then undetected — within each group keep weight order
  const sortedTypes = [...ALL_SIGNAL_TYPES].sort((a, b) => {
    const aDetected = !!detectedByType[a]
    const bDetected = !!detectedByType[b]
    if (aDetected !== bDetected) return aDetected ? -1 : 1
    return 0
  })

  const location = [company.city, company.state, company.country].filter(Boolean).join(', ')

  return (
    <div className="p-4 hover:bg-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Name + score + timeline */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/companies/${company.id}`}
              className="font-semibold text-foreground hover:text-primary transition-colors"
            >
              {company.name}
            </Link>

            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${scoreColor(confidenceScore)}`}>
              {(confidenceScore * 100).toFixed(0)}% confidence
            </span>

            {prospect.timelinePrediction && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                {formatTimeline(prospect.timelinePrediction)}
              </span>
            )}
          </div>

          {/* Description / domain */}
          {(company.description || company.domain) && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {company.description || company.domain}
            </p>
          )}

          {/* Location + headcount */}
          {(location || company.headcount) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {[location, company.headcount ? `${company.headcount} employees` : null]
                .filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Signal chips */}
          {signals.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {signals.map((s) => (
                <span
                  key={s.id}
                  className="text-xs px-2 py-0.5 bg-muted rounded-full"
                  title={s.description || undefined}
                >
                  {SIGNAL_EMOJIS[s.type]} {SIGNAL_LABELS[s.type] || s.type}
                </span>
              ))}
            </div>
          )}

          {/* "Why this score?" toggle */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
            Why this score?
          </button>

          {/* ── Confidence breakdown ── */}
          {expanded && (
            <div className="mt-3 rounded-lg border border-border overflow-hidden text-sm">

              {/* Header with normalization note (#1) */}
              <div className="bg-muted/50 px-3 py-2 border-b border-border space-y-1">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Confidence Breakdown
                </p>
                {isNormalized && (
                  <div className="flex items-start gap-1.5">
                    <InfoIcon className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Score is <strong>normalized</strong> across the {signals.length} signal{signals.length !== 1 ? 's' : ''} detectable for this company
                      ({(activeWeightSum * 100).toFixed(0)}% of total weight). A company with all 5 signals active would be compared differently.
                    </p>
                  </div>
                )}
              </div>

              <div className="divide-y divide-border">
                {sortedTypes.map((type) => {
                  const signal = detectedByType[type]
                  const weight = SIGNAL_WEIGHTS[type]
                  const detected = !!signal

                  return (
                    <div key={type} className={`px-3 py-2.5 ${detected ? '' : 'opacity-60'}`}>
                      {/* Signal header row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span>{SIGNAL_EMOJIS[type]}</span>
                          <span className={`text-xs font-medium ${detected ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {SIGNAL_LABELS[type]}
                          </span>
                          <span className="text-xs text-muted-foreground/60">
                            (max {(weight * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <div className="shrink-0">
                          {detected ? (
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${scoreColor(contribution(signal))}`}>
                              +{(contribution(signal) * 100).toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Not detected</span>
                          )}
                        </div>
                      </div>

                      {/* Detected: bar + description + raw data (#4 — bar scales to signal's own strength) */}
                      {detected && (
                        <div className="mt-1.5 ml-5 space-y-1.5">
                          <div className="flex items-center gap-2">
                            {/* #4: bar width = signal.strength (0–1), so 100% = this signal fully firing */}
                            <div className="flex-1 bg-muted rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${barColor(signal.strength)}`}
                                style={{ width: `${signal.strength * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {(signal.strength * 100).toFixed(0)}% strength
                            </span>
                          </div>
                          {signal.description && (
                            <p className="text-xs text-muted-foreground">{signal.description}</p>
                          )}
                          <MetadataDetail type={type} meta={parseMetadata(signal.metadata)} />
                          <p className="text-xs text-muted-foreground/60">
                            Detected {timeAgo(signal.detectedAt)}
                          </p>
                        </div>
                      )}

                      {/* Not detected: specific reason (#3) + unlock hint (#6) */}
                      {!detected && (
                        <div className="mt-1 ml-5 space-y-1.5">
                          <p className="text-xs text-muted-foreground">
                            {notDetectedReason(type, company.headcount)}
                          </p>
                          <div className="flex items-start gap-1">
                            <TrendingUpIcon className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              {unlockHint(type, company.headcount)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Total row */}
              <div className="bg-muted/30 px-3 py-2 border-t border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Total confidence score</span>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${scoreColor(confidenceScore)}`}>
                  {(confidenceScore * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Status / priority badges + reminder */}
        <div className="flex flex-col gap-1.5 shrink-0 items-end">
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-muted text-foreground">
            {prospect.status}
          </span>
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-muted text-foreground">
            {prospect.priority}
          </span>
          <button
            type="button"
            onClick={() => setReminderOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Set a reminder for this prospect"
          >
            <BellIcon className="h-3 w-3" />
            Remind
          </button>
        </div>
      </div>

      {/* Reminder Dialog */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Reminder — {company.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="reminderDate">Reminder Date</Label>
              <Input
                id="reminderDate"
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reminderNote">Note (optional)</Label>
              <Input
                id="reminderNote"
                placeholder={`e.g. Follow up with ${company.name}`}
                value={reminderContent}
                onChange={(e) => setReminderContent(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setReminderOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveReminder}
                disabled={!reminderDate || reminderSaving}
              >
                {reminderSaved ? '✓ Saved!' : reminderSaving ? 'Saving…' : 'Set Reminder'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
