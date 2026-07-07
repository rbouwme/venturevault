import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApplicationsBoard } from '@/components/applications/applications-board'

export default async function ApplicationsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/auth/signin')

  const applications = await prisma.jobApplication.findMany({
    where: { userId: session.user.id, archivedAt: null },
    include: {
      company: {
        select: { id: true, name: true, domain: true, logoUrl: true },
      },
    },
    orderBy: { appliedAt: 'desc' },
  })

  return <ApplicationsBoard initialApplications={JSON.parse(JSON.stringify(applications))} />
}
