'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PlusIcon, ExternalLinkIcon, TrashIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const STAGES = [
  { key: 'APPLIED', label: 'Applied', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  { key: 'PHONE_SCREEN', label: 'Phone Screen', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  { key: 'TECHNICAL', label: 'Technical', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { key: 'ONSITE', label: 'Onsite', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  { key: 'OFFER', label: 'Offer', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  { key: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
]

interface Application {
  id: string
  position: string
  status: string
  appliedAt: string
  url: string | null
  source: string | null
  notes: string | null
  nextStep: string | null
  nextStepAt: string | null
  company: {
    id: string
    name: string
    domain: string | null
    logoUrl: string | null
  }
}

interface AddDialogState {
  open: boolean
  companyName: string
  companyId: string
  position: string
  url: string
  source: string
  notes: string
}

function timeAgo(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  return `${Math.floor(days / 30)}mo ago`
}

interface KanbanCardProps {
  app: Application
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
}

function KanbanCard({ app, onStatusChange, onDelete }: KanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-1.5 shadow-sm">
      <div className="flex items-start justify-between gap-1">
        <Link
          href={`/dashboard/companies/${app.company.id}`}
          className="text-xs font-semibold text-primary hover:underline truncate"
        >
          {app.company.name}
        </Link>
        {app.url && (
          <a href={app.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <ExternalLinkIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </a>
        )}
      </div>

      <p className="text-[13px] font-medium text-foreground leading-snug">{app.position}</p>

      <p className="text-[11px] text-muted-foreground">Applied {timeAgo(app.appliedAt)}</p>

      {app.nextStep && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 truncate">
          Next: {app.nextStep}
          {app.nextStepAt && ` · ${new Date(app.nextStepAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-[11px] text-muted-foreground hover:text-foreground underline"
          >
            Move
          </button>
          {menuOpen && (
            <div className="absolute top-5 left-0 z-20 bg-card border border-border rounded-md shadow-lg py-1 min-w-[140px]">
              {STAGES.filter((s) => s.key !== app.status).map((s) => (
                <button
                  key={s.key}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                  onClick={() => { onStatusChange(app.id, s.key); setMenuOpen(false) }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => onDelete(app.id)}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <TrashIcon className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

interface ApplicationsBoardProps {
  initialApplications: Application[]
}

export function ApplicationsBoard({ initialApplications }: ApplicationsBoardProps) {
  const [applications, setApplications] = useState<Application[]>(initialApplications)
  const [addDialog, setAddDialog] = useState<AddDialogState>({
    open: false, companyName: '', companyId: '', position: '', url: '', source: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [companySuggestions, setCompanySuggestions] = useState<{ id: string; name: string }[]>([])
  const [companySearch, setCompanySearch] = useState('')

  const byStatus = STAGES.reduce<Record<string, Application[]>>((acc, s) => {
    acc[s.key] = applications.filter((a) => a.status === s.key)
    return acc
  }, {})

  async function searchCompanies(q: string) {
    setCompanySearch(q)
    if (q.length < 2) { setCompanySuggestions([]); return }
    const res = await fetch(`/api/companies/search?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const data = await res.json()
      setCompanySuggestions(data.companies || [])
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setApplications((prev) => prev.filter((a) => a.id !== id))
    }
  }

  async function handleAdd() {
    if (!addDialog.companyId || !addDialog.position) return
    setSaving(true)
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: addDialog.companyId,
          position: addDialog.position,
          url: addDialog.url || undefined,
          source: addDialog.source || undefined,
          notes: addDialog.notes || undefined,
        }),
      })
      if (res.ok) {
        const app = await res.json()
        setApplications((prev) => [app, ...prev])
        setAddDialog({ open: false, companyName: '', companyId: '', position: '', url: '', source: '', notes: '' })
        setCompanySearch('')
        setCompanySuggestions([])
      }
    } finally {
      setSaving(false)
    }
  }

  const total = applications.length
  const active = applications.filter((a) => !['REJECTED', 'OFFER'].includes(a.status)).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground">
            {total} total · {active} active
          </p>
        </div>
        <Button size="sm" onClick={() => setAddDialog((d) => ({ ...d, open: true }))}>
          <PlusIcon className="h-4 w-4 mr-1.5" />
          Add Application
        </Button>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const cards = byStatus[stage.key] || []
          return (
            <div key={stage.key} className="min-w-[160px]">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stage.color}`}>
                  {stage.label}
                </span>
                <span className="text-xs text-muted-foreground font-medium">{cards.length}</span>
              </div>
              <div className="space-y-2">
                {cards.map((app) => (
                  <KanbanCard
                    key={app.id}
                    app={app}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
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

      {/* Add Dialog */}
      <Dialog open={addDialog.open} onOpenChange={(o) => setAddDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Track New Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label>Company</Label>
              <div className="relative">
                <Input
                  placeholder="Search companies..."
                  value={companySearch}
                  onChange={(e) => searchCompanies(e.target.value)}
                />
                {companySuggestions.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-md shadow-lg z-30">
                    {companySuggestions.map((c) => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                        onClick={() => {
                          setAddDialog((d) => ({ ...d, companyId: c.id, companyName: c.name }))
                          setCompanySearch(c.name)
                          setCompanySuggestions([])
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {addDialog.companyId && (
                <p className="text-xs text-green-600">Selected: {addDialog.companyName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Position</Label>
              <Input
                placeholder="e.g. Sales Analyst"
                value={addDialog.position}
                onChange={(e) => setAddDialog((d) => ({ ...d, position: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Job URL (optional)</Label>
              <Input
                placeholder="https://..."
                value={addDialog.url}
                onChange={(e) => setAddDialog((d) => ({ ...d, url: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Source</Label>
              <select
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                value={addDialog.source}
                onChange={(e) => setAddDialog((d) => ({ ...d, source: e.target.value }))}
              >
                <option value="">Select source...</option>
                <option value="CAREERS_PAGE">Careers Page</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="REFERRAL">Referral</option>
                <option value="COLD_OUTREACH">Cold Outreach</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Any notes..."
                value={addDialog.notes}
                onChange={(e) => setAddDialog((d) => ({ ...d, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setAddDialog((d) => ({ ...d, open: false }))}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!addDialog.companyId || !addDialog.position || saving}
              >
                {saving ? 'Adding…' : 'Add Application'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
