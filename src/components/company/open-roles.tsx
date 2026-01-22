import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { JobPosting } from '@prisma/client'

interface OpenRolesProps {
  jobs: JobPosting[]
  careersUrl?: string | null
}

export function OpenRoles({ jobs, careersUrl }: OpenRolesProps) {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Open Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-4">
            No open positions in the last 30 days.
          </p>
          {careersUrl && (
            <div className="text-center">
              <a
                href={careersUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                Check careers page for updates →
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const departmentGroups = jobs.reduce((acc, job) => {
    const dept = job.department || 'Other'
    if (!acc[dept]) acc[dept] = []
    acc[dept].push(job)
    return acc
  }, {} as Record<string, JobPosting[]>)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Open Roles ({jobs.length})</CardTitle>
        {careersUrl && (
          <a
            href={careersUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View all →
          </a>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(departmentGroups).map(([department, deptJobs]) => (
            <div key={department}>
              <h4 className="font-medium text-gray-900 mb-3">{department}</h4>
              <div className="space-y-3">
                {deptJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">{job.title}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        {job.location && <span>{job.location}</span>}
                        {job.remote && (
                          <Badge variant="outline" className="text-xs">
                            Remote
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(job.postedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
