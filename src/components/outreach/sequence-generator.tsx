'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SequenceEmail {
  step: number
  dayOffset: number
  label: string
  subject: string
  body: string
}

interface SequenceGeneratorProps {
  companies: { id: string; name: string }[]
}

export function SequenceGenerator({ companies }: SequenceGeneratorProps) {
  const [companyId, setCompanyId] = useState('')
  const [senderName, setSenderName] = useState('')
  const [senderRole, setSenderRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [sequence, setSequence] = useState<SequenceEmail[] | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<number | null>(null)

  async function generate() {
    if (!companyId) return
    setLoading(true)
    setError('')
    setSequence(null)
    try {
      const res = await fetch('/api/outreach/sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, senderName, senderRole }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to generate'); return }
      setSequence(data.sequence)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function copy(text: string, step: number) {
    navigator.clipboard.writeText(text)
    setCopied(step)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-5">
      {/* Config */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Generate 3-Email Sequence</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Company</Label>
            <select
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">Select company...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Your Name (optional)</Label>
            <Input
              placeholder="Jane Smith"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Your Role / Target (optional)</Label>
            <Input
              placeholder="e.g. sales analyst candidate"
              value={senderRole}
              onChange={(e) => setSenderRole(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={generate} disabled={!companyId || loading}>
          {loading ? 'Generating sequence…' : 'Generate Sequence'}
        </Button>
      </div>

      {/* Sequence output */}
      {sequence && (
        <div className="space-y-4">
          {sequence.map((email) => (
            <div key={email.step} className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    Email {email.step}
                  </span>
                  <span className="text-sm font-medium text-foreground">{email.label}</span>
                  <span className="text-xs text-muted-foreground">
                    Send on Day {email.dayOffset}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(`Subject: ${email.subject}\n\n${email.body}`, email.step)}
                >
                  {copied === email.step ? '✓ Copied' : 'Copy'}
                </Button>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
                    Subject
                  </p>
                  <p className="text-sm font-medium text-foreground bg-muted/50 rounded px-3 py-1.5">
                    {email.subject}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
                    Body
                  </p>
                  <pre className="text-sm text-foreground bg-muted/30 rounded px-3 py-2 whitespace-pre-wrap font-sans leading-relaxed">
                    {email.body}
                  </pre>
                </div>
              </div>
            </div>
          ))}

          <p className="text-xs text-muted-foreground text-center">
            Tip: Customize each email before sending. Day 0 = send immediately, Day 4 = follow up if no reply, Day 10 = final close.
          </p>
        </div>
      )}
    </div>
  )
}
