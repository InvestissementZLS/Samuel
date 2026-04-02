import { prisma } from './lib/prisma';
const r = await prisma.product.findMany({
  select: { name: true, price: true, division: true, type: true },
  orderBy: [{ division: 'asc' }, { name: 'asc' }]
});
console.log(JSON.stringify(r, null, 2));
await prisma.$disconnect();
