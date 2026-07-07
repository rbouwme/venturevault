const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Get the first user
  const user = await prisma.user.findFirst()

  if (!user) {
    console.log('No users found. Please sign up first.')
    return
  }

  console.log(`Found user: ${user.email}`)

  // Get some companies to recommend
  const companies = await prisma.company.findMany({
    where: {
      archivedAt: null,
    },
    take: 10,
  })

  console.log(`Found ${companies.length} companies`)

  if (companies.length === 0) {
    console.log('No companies found in database.')
    return
  }

  // Delete existing recommendations for this user
  await prisma.recommendation.deleteMany({
    where: { userId: user.id },
  })

  // Create recommendations
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24) // 24-hour TTL

  const recommendations = companies.map((company, index) => ({
    userId: user.id,
    companyId: company.id,
    score: 0.9 - (index * 0.05), // Decreasing scores
    matchReason: 'POPULAR_TRENDING',
    matchFactors: JSON.stringify({
      tagMatch: 0,
      locationMatch: 0,
      fundingStageMatch: 0,
      sizeMatch: 0,
    }),
    expiresAt,
  }))

  await prisma.recommendation.createMany({
    data: recommendations,
  })

  console.log(`✅ Created ${recommendations.length} recommendations for ${user.email}`)
  console.log('Refresh the dashboard to see them!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
