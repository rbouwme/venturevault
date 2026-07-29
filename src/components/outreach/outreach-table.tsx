'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { OUTREACH_TYPES, OUTREACH_STATUSES } from '@/lib/constants'
import type { Company, OutreachDraft } from '@prisma/client'
import type { OutreachStatus } from '@/types/enums'

type DraftWithCompany = OutreachDraft & { company: Company }

interface OutreachTableProps {
  drafts: DraftWithCompany[]
}

export function OutreachTable({ drafts: initialDrafts }: OutreachTableProps) {
  const [drafts, setDrafts] = useState(initialDrafts)
  const [viewingDraft, setViewingDraft] = useState<DraftWithCompany | null>(null)

  const handleStatusChange = async (id: string, status: OutreachStatus) => {
    try {
      const response = await fetch(`/api/outreach/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        setDrafts(
          drafts.map((d) => (d.id === id ? { ...d, status } : d))
        )
        toast.success('Status updated')
      } else {
        toast.error('Failed to update status')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/outreach/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDrafts(drafts.filter((d) => d.id !== id))
        toast.success('Draft deleted')
      } else {
        toast.error('Failed to delete draft')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }

  const getStatusBadge = (status: OutreachStatus) => {
    const variants: Partial<Record<OutreachStatus, string>> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      RESPONDED: 'bg-green-100 text-green-800',
      NO_RESPONSE: 'bg-yellow-100 text-yellow-800',
    }

    return (
      <Badge className={variants[status]}>
        {OUTREACH_STATUSES.find((s) => s.value === status)?.label || status}
      </Badge>
    )
  }

  if (drafts.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <div className="text-4xl mb-4">✉️</div>
        <h3 className="text-lg font-semibold text-gray-900">
          No outreach drafts yet
        </h3>
        <p className="mt-2 text-gray-600">
          Generate outreach drafts from company pages.
        </p>
        <Link href="/dashboard">
          <Button className="mt-4">Browse Companies</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drafts.map((draft) => (
            <TableRow key={draft.id}>
              <TableCell>
                <Link
                  href={`/dashboard/companies/${draft.company.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {draft.company.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {OUTREACH_TYPES.find((t) => t.value === draft.type)?.label || draft.type}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {draft.subject || <span className="text-gray-400">No subject</span>}
              </TableCell>
              <TableCell>
                <Select
                  value={draft.status}
                  onValueChange={(value) =>
                    handleStatusChange(draft.id, value as OutreachStatus)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue>{getStatusBadge(draft.status as OutreachStatus)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {OUTREACH_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {formatDate(draft.createdAt)}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingDraft(draft)}
                    >
                      View
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        Outreach to {viewingDraft?.company.name}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {viewingDraft?.subject && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            Subject
                          </p>
                          <p className="mt-1 p-3 bg-gray-50 rounded-lg">
                            {viewingDraft.subject}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Message
                        </p>
                        <p className="mt-1 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                          {viewingDraft?.body}
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(draft.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
