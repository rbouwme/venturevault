const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check current contact count
  const contactCount = await prisma.person.count({ where: { archivedAt: null } });
  console.log(`Current contacts in database: ${contactCount}`);

  // Get a sample company with a YC URL to test the scraper
  const company = await prisma.company.findFirst({
    where: {
      archivedAt: null,
      ycUrl: { not: null },
      domain: { not: null },
    },
    select: { id: true, name: true, domain: true, ycUrl: true },
  });

  if (company) {
    console.log(`\nTest company: ${company.name}`);
    console.log(`Domain: ${company.domain}`);
    console.log(`YC URL: ${company.ycUrl}`);
  }

  await prisma.$disconnect();
}

main();
