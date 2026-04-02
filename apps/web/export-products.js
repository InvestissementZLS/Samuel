const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { division: "EXTERMINATION" },
    select: { id: true, name: true, price: true, type: true }
  });
  
  fs.writeFileSync('product-list.json', JSON.stringify(products, null, 2), 'utf8');
  console.log('Exported ' + products.length + ' products.');
}

main().finally(() => prisma.$disconnect());
