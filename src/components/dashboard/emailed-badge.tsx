'use client'

import { useState } from 'react'
import { MailIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ColdEmailRecord {
  id: string
  emailAddress: string
  sentAt: string
  followUpStatus: string
  notes: string | null
}

interface EmailedBadgeProps {
  coldEmail: ColdEmailRecord
}

const STATUS_LABELS: Record<string, string> = {
  SENT: 'Sent',
  FOLLOW_UP_1: 'Follow-up 1',
  FOLLOW_UP_2: 'Follow-up 2',
  REPLIED: 'Replied',
  NO_RESPONSE: 'No Response',
  BOUNCED: 'Bounced',
}

const STATUS_COLORS: Record<string, string> = {
  SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  FOLLOW_UP_1: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  FOLLOW_UP_2: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  REPLIED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  NO_RESPONSE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  BOUNCED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function EmailedBadge({ coldEmail }: EmailedBadgeProps) {
  const [open, setOpen] = useState(false)
  const statusLabel = STATUS_LABELS[coldEmail.followUpStatus] ?? coldEmail.followUpStatus
  const statusColor = STATUS_COLORS[coldEmail.followUpStatus] ?? STATUS_COLORS.SENT

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border border-violet-200 dark:border-violet-700 hover:bg-violet-200 dark:hover:bg-violet-900/60 transition-colors"
      >
        <MailIcon className="h-3 w-3" />
        Emailed {formatShortDate(coldEmail.sentAt)} · {statusLabel}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MailIcon className="h-4 w-4" />
              Email Log
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Email address</p>
              <p className="text-sm font-medium">{coldEmail.emailAddress}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Sent on</p>
              <p className="text-sm font-medium">{formatFullDate(coldEmail.sentAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Status</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
            {coldEmail.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{coldEmail.notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
