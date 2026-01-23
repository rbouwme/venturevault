import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserSettings, getAlerts } from '@/services/user'
import { SettingsForm } from '@/components/settings/settings-form'
import { AlertsManager } from '@/components/settings/alerts-manager'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const [user, alerts] = await Promise.all([
    getUserSettings(session.user.id),
    getAlerts(session.user.id),
  ])

  if (!user) {
    redirect('/auth/signin')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <SettingsForm user={user} />

      <AlertsManager alerts={alerts} userEmail={user.email} />
    </div>
  )
}
