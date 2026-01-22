'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Alert } from '@prisma/client'

interface AlertsManagerProps {
  alerts: Alert[]
  userEmail: string
}

export function AlertsManager({ alerts: initialAlerts, userEmail }: AlertsManagerProps) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [isCreating, setIsCreating] = useState(false)
  const [newAlert, setNewAlert] = useState({
    name: '',
    email: userEmail,
    filters: {},
  })

  const handleCreate = async () => {
    if (!newAlert.name) {
      toast.error('Alert name is required')
      return
    }

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlert),
      })

      if (response.ok) {
        const alert = await response.json()
        setAlerts([alert, ...alerts])
        setNewAlert({ name: '', email: userEmail, filters: {} })
        setIsCreating(false)
        toast.success('Alert created')
      } else {
        toast.error('Failed to create alert')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/alerts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })

      if (response.ok) {
        setAlerts(alerts.map((a) => (a.id === id ? { ...a, enabled } : a)))
        toast.success(enabled ? 'Alert enabled' : 'Alert disabled')
      } else {
        toast.error('Failed to update alert')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/alerts/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setAlerts(alerts.filter((a) => a.id !== id))
        toast.success('Alert deleted')
      } else {
        toast.error('Failed to delete alert')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Email Alerts</CardTitle>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button size="sm">New Alert</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Email Alert</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alertName">Alert Name</Label>
                <Input
                  id="alertName"
                  value={newAlert.name}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, name: e.target.value })
                  }
                  placeholder="e.g., Series A in SF"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alertEmail">Email</Label>
                <Input
                  id="alertEmail"
                  type="email"
                  value={newAlert.email}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, email: e.target.value })
                  }
                />
              </div>
              <p className="text-sm text-gray-600">
                Configure filters from the dashboard and save them as an alert
                to receive email notifications for new matches.
              </p>
              <Button onClick={handleCreate} className="w-full">
                Create Alert
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-center text-gray-600 py-4">
            No alerts configured. Create one to get notified about new funding
            events.
          </p>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={alert.enabled}
                    onCheckedChange={(checked) =>
                      handleToggle(alert.id, !!checked)
                    }
                  />
                  <div>
                    <p className="font-medium">{alert.name}</p>
                    <p className="text-sm text-gray-500">{alert.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={alert.enabled ? 'default' : 'secondary'}>
                    {alert.enabled ? 'Active' : 'Paused'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(alert.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
