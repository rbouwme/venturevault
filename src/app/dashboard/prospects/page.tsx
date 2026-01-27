import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProspects, getProspectStats } from '@/services/prospects'

export default async function ProspectsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const [prospects, stats] = await Promise.all([
    getProspects(session.user.id),
    getProspectStats(session.user.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Prospects</h1>
        <p className="text-muted-foreground">
          Companies likely to announce funding soon based on hiring signals and growth indicators
        </p>
      </div>

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

      {/* Prospects List */}
      {prospects.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No prospects yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Prospects are automatically detected based on hiring spikes and growth signals.
            <br />
            The system runs daily to identify high-potential companies.
          </p>
          <p className="text-sm text-muted-foreground">
            You can also manually add companies to track by clicking on any company and selecting
            "Add to Prospects"
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {prospects.map((prospect) => (
            <div
              key={prospect.id}
              className="p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">
                      {prospect.company.name}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        prospect.confidenceScore >= 0.7
                          ? 'bg-green-100 text-green-800'
                          : prospect.confidenceScore >= 0.5
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {(prospect.confidenceScore * 100).toFixed(0)}% confident
                    </span>
                    {prospect.timelinePrediction && (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                        {prospect.timelinePrediction.replace(/_/g, '-').toLowerCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {prospect.company.description || prospect.company.domain}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {prospect.signals.slice(0, 3).map((signal) => (
                      <span
                        key={signal.id}
                        className="text-xs px-2 py-1 bg-muted rounded"
                        title={signal.description || undefined}
                      >
                        {signal.type === 'HIRING_SPIKE' && '📈'}
                        {signal.type === 'NEWS_MENTION' && '📰'}
                        {signal.type === 'HEADCOUNT_GROWTH' && '👥'}
                        {signal.type === 'JOB_VELOCITY' && '⚡'}
                        {signal.type === 'FUNDING_PATTERN' && '💰'}
                        {' '}
                        {signal.type.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-muted text-foreground">
                    {prospect.status}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded bg-muted text-foreground">
                    {prospect.priority}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
