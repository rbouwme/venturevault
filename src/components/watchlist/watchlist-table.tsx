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
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatAmount, formatDate } from '@/lib/utils'
import type { Company, FundingEvent, Watchlist } from '@prisma/client'

type WatchlistItem = Watchlist & {
  company: Company & {
    fundingEvents: FundingEvent[]
    _count: { jobPostings: number }
  }
}

interface WatchlistTableProps {
  items: WatchlistItem[]
}

export function WatchlistTable({ items: initialItems }: WatchlistTableProps) {
  const [items, setItems] = useState(initialItems)
  const [editingNotes, setEditingNotes] = useState<{ id: string; notes: string } | null>(null)

  const handleRemove = async (companyId: string) => {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })

      if (response.ok) {
        setItems(items.filter((item) => item.companyId !== companyId))
        toast.success('Removed from watchlist')
      } else {
        toast.error('Failed to remove from watchlist')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }

  const handleUpdateNotes = async () => {
    if (!editingNotes) return

    try {
      const response = await fetch('/api/watchlist/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: editingNotes.id,
          notes: editingNotes.notes,
        }),
      })

      if (response.ok) {
        setItems(
          items.map((item) =>
            item.companyId === editingNotes.id
              ? { ...item, notes: editingNotes.notes }
              : item
          )
        )
        setEditingNotes(null)
        toast.success('Notes updated')
      } else {
        toast.error('Failed to update notes')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <div className="text-4xl mb-4">⭐</div>
        <h3 className="text-lg font-semibold text-gray-900">
          Your watchlist is empty
        </h3>
        <p className="mt-2 text-gray-600">
          Add companies to your watchlist to track them here.
        </p>
        <Link href="/dashboard">
          <Button className="mt-4">Browse Funding Feed</Button>
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
            <TableHead>Latest Funding</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Added</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const latestFunding = item.company.fundingEvents[0]
            const isHiring = item.company._count.jobPostings > 0

            return (
              <TableRow key={item.id}>
                <TableCell>
                  <Link
                    href={`/dashboard/companies/${item.company.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {item.company.name}
                  </Link>
                  {item.company.domain && (
                    <p className="text-sm text-gray-500">{item.company.domain}</p>
                  )}
                </TableCell>
                <TableCell>
                  {latestFunding ? (
                    <div>
                      <p className="font-medium">
                        {latestFunding.amountCents
                          ? formatAmount(Number(latestFunding.amountCents))
                          : 'Undisclosed'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {latestFunding.roundType.replace('_', ' ')}
                      </p>
                    </div>
                  ) : (
                    <span className="text-gray-500">No funding data</span>
                  )}
                </TableCell>
                <TableCell>
                  {isHiring ? (
                    <Badge className="bg-green-100 text-green-800">Hiring</Badge>
                  ) : (
                    <Badge variant="secondary">Not Hiring</Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-xs">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setEditingNotes({
                            id: item.companyId,
                            notes: item.notes || '',
                          })
                        }
                      >
                        {item.notes ? (
                          <span className="truncate max-w-32">{item.notes}</span>
                        ) : (
                          <span className="text-gray-400">Add notes</span>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Notes for {item.company.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Add your notes..."
                          value={editingNotes?.notes || ''}
                          onChange={(e) =>
                            setEditingNotes((prev) =>
                              prev ? { ...prev, notes: e.target.value } : null
                            )
                          }
                        />
                        <Button onClick={handleUpdateNotes}>Save Notes</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {formatDate(item.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleRemove(item.companyId)}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
