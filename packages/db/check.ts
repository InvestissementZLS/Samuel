import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
async function main() {
  const invs = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(invs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
