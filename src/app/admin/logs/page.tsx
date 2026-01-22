import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const dynamic = 'force-dynamic'

async function getIngestionLogs() {
  const [runs, logs] = await Promise.all([
    prisma.ingestionRun.findMany({
      take: 20,
      orderBy: { startedAt: 'desc' },
    }),
    prisma.ingestionLog.findMany({
      take: 100,
      orderBy: { timestamp: 'desc' },
      include: {
        run: {
          select: { source: true },
        },
      },
    }),
  ])

  return { runs, logs }
}

export default async function LogsPage() {
  const { runs, logs } = await getIngestionLogs()

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      RUNNING: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
    }
    return <Badge className={variants[status] || 'bg-gray-100'}>{status}</Badge>
  }

  const getLogLevelBadge = (level: string) => {
    const variants: Record<string, string> = {
      INFO: 'bg-blue-100 text-blue-800',
      WARN: 'bg-yellow-100 text-yellow-800',
      ERROR: 'bg-red-100 text-red-800',
    }
    return (
      <Badge variant="outline" className={variants[level] || ''}>
        {level}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ingestion Logs</h1>
        <p className="text-gray-600">View ingestion run history and logs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ingestion Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-center text-gray-600 py-4">No ingestion runs yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">
                      {run.source || 'All Sources'}
                    </TableCell>
                    <TableCell>
                      {new Date(run.startedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {run.completedAt
                        ? new Date(run.completedAt).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(run.status)}</TableCell>
                    <TableCell>{run.itemsProcessed}</TableCell>
                    <TableCell>{run.errorCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-gray-600 py-4">No logs yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <div className="flex-shrink-0">
                    {getLogLevelBadge(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900">{log.message}</p>
                    {log.details && (
                      <pre className="mt-1 text-xs text-gray-500 overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
