'use client'

import { useState } from 'react'
import { MailIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Contact {
  id: string
  name: string
  email: string | null
  title: string | null
  role: string | null
}

interface ColdEmailButtonProps {
  companyId: string
  companyName: string
}

export function ColdEmailButton({ companyId, companyName }: ColdEmailButtonProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'exists'>('idle')
  const [emailAddress, setEmailAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsFetched, setContactsFetched] = useState(false)

  async function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen && !contactsFetched) {
      setContactsLoading(true)
      try {
        const res = await fetch(`/api/companies/${companyId}/contacts`)
        if (res.ok) {
          const data = await res.json()
          setContacts(data.contacts || [])
        }
      } catch {
        // silently fail — autofill just won't be available
      } finally {
        setContactsLoading(false)
        setContactsFetched(true)
      }
    }
  }

  function handleContactSelect(contactId: string) {
    const contact = contacts.find((c) => c.id === contactId)
    if (!contact?.email) return
    setEmailAddress(contact.email)
    const titleLine = contact.title || contact.role
    setNotes(`To: ${contact.name}${titleLine ? `, ${titleLine}` : ''}`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!emailAddress.trim()) return

    setStatus('loading')

    try {
      const res = await fetch('/api/cold-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          emailAddress: emailAddress.trim(),
          notes: notes.trim() || null,
        }),
      })

      if (res.status === 409) {
        setStatus('exists')
      } else if (res.ok) {
        setStatus('sent')
        setOpen(false)
      } else {
        setStatus('idle')
      }
    } catch {
      setStatus('idle')
    }
  }

  if (status === 'sent') {
    return (
      <Button variant="outline" disabled>
        <MailIcon className="mr-2 h-4 w-4" />
        Email Logged
      </Button>
    )
  }

  if (status === 'exists') {
    return (
      <Button variant="outline" disabled>
        <MailIcon className="mr-2 h-4 w-4" />
        Already Logged
      </Button>
    )
  }

  const contactsWithEmail = contacts.filter((c) => c.email)
  const contactsWithoutEmail = contacts.filter((c) => !c.email)
  const hasContacts = contactsLoading || contacts.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MailIcon className="mr-2 h-4 w-4" />
          Cold Email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Log Cold Email</DialogTitle>
            <DialogDescription>
              Record a cold email sent to {companyName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {hasContacts && (
              <div className="space-y-2">
                <Label>Autofill from Contacts</Label>
                <Select onValueChange={handleContactSelect} disabled={contactsLoading}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={contactsLoading ? 'Loading contacts…' : 'Select a contact…'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {contactsWithEmail.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name}
                        {contact.title || contact.role
                          ? ` · ${contact.title || contact.role}`
                          : ''}
                      </SelectItem>
                    ))}
                    {contactsWithoutEmail.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id} disabled>
                        <span className="opacity-50">
                          {contact.name}
                          {contact.title || contact.role
                            ? ` · ${contact.title || contact.role}`
                            : ''}{' '}
                          (no email)
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@company.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="What did you say? Any context..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={status === 'loading' || !emailAddress.trim()}>
              {status === 'loading' ? 'Saving...' : 'Log Email'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
