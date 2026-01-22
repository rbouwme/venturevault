import { prisma } from '@/lib/prisma'
import { IngestionControl } from '@/components/admin/ingestion-control'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

async function getStats() {
  const [companies, fundingEvents, ingestionRuns] = await Promise.all([
    prisma.company.count({ where: { archivedAt: null } }),
    prisma.fundingEvent.count(),
    prisma.ingestionRun.findMany({
      take: 5,
      orderBy: { startedAt: 'desc' },
    }),
  ])

  return { companies, fundingEvents, ingestionRuns }
}

export default async function AdminPage() {
  const stats = await getStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600">
          Manage data ingestion and view system stats
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.companies}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Funding Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.fundingEvents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Recent Ingestion Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.ingestionRuns.length}</p>
          </CardContent>
        </Card>
      </div>

      <IngestionControl />

      {stats.ingestionRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Ingestion Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.ingestionRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {run.source || 'All Sources'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(run.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${
                        run.status === 'COMPLETED'
                          ? 'text-green-600'
                          : run.status === 'FAILED'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }`}
                    >
                      {run.status}
                    </p>
                    {run.itemsProcessed > 0 && (
                      <p className="text-sm text-gray-500">
                        {run.itemsProcessed} items
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
