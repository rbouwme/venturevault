import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProspects, getProspectStats, getUpcomingReminders } from '@/services/prospects'
import { ProspectCard } from '@/components/prospects/prospect-card'
import { ProspectKanban } from '@/components/prospects/prospect-kanban'
import { ProspectViewToggle } from '@/components/prospects/prospect-view-toggle'

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; view?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/auth/signin')

  const { country, view } = await searchParams
  const isKanban = view === 'kanban'

  const [prospects, stats, reminders] = await Promise.all([
    getProspects(session.user.id, country ? { country } : undefined),
    getProspectStats(session.user.id),
    getUpcomingReminders(session.user.id),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prospects</h1>
          <p className="text-muted-foreground">
            Companies likely to announce funding soon based on hiring signals and growth indicators
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {prospects.length > 0 && (
            <a
              href="/api/export/prospects"
              download
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border border-border bg-card text-foreground hover:bg-accent transition-colors"
            >
              ↓ Export CSV
            </a>
          )}
          <ProspectViewToggle currentView={isKanban ? 'kanban' : 'list'} />
        </div>
      </div>

      {/* Upcoming Reminders */}
      {reminders.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3">
            Upcoming Reminders ({reminders.length})
          </h2>
          <div className="space-y-2">
            {reminders.map((reminder) => {
              const date = new Date(reminder.reminderDate!)
              const daysUntil = Math.ceil((date.getTime() - Date.now()) / 86_400_000)
              const dueLabel =
                daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`
              return (
                <div key={reminder.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground">
                      {reminder.prospect.company.name}
                    </span>
                    <span className="text-muted-foreground ml-2">— {reminder.content}</span>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                      daysUntil === 0
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        : daysUntil <= 2
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    }`}
                  >
                    {dueLabel} ·{' '}
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Prospects</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">High Confidence</p>
          <p className="text-2xl font-bold text-green-600">{stats.highConfidence}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Avg Confidence</p>
          <p className="text-2xl font-bold text-foreground">
            {(stats.avgConfidence * 100).toFixed(0)}%
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Converted</p>
          <p className="text-2xl font-bold text-blue-600">{stats.converted}</p>
        </div>
      </div>

      {/* Prospects View */}
      {prospects.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No prospects yet</h3>
          <p className="text-muted-foreground mb-6">
            Prospects are automatically detected based on hiring spikes and growth signals.
            <br />
            The system runs daily to identify high-potential companies.
          </p>
          <p className="text-sm text-muted-foreground">
            You can also manually add companies to track by clicking on any company and selecting
            &quot;Add to Prospects&quot;
          </p>
        </div>
      ) : isKanban ? (
        <ProspectKanban prospects={JSON.parse(JSON.stringify(prospects))} />
      ) : (
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {prospects.map((prospect) => (
            <ProspectCard key={prospect.id} prospect={prospect} />
          ))}
        </div>
      )}
    </div>
  )
}
