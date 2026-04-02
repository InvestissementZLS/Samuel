const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProgress() {
  const clients = await prisma.client.count();
  const products = await prisma.product.count();
  const quotes = await prisma.quote.count();
  const invoices = await prisma.invoice.count();
  const quotesEx = await prisma.quote.count({ where: { division: "EXTERMINATION" } });
  
  console.log(`Clients: ${clients}`);
  console.log(`Products: ${products}`);
  console.log(`Quotes (Total): ${quotes} | Quotes (EXTERMINATION): ${quotesEx}`);
  console.log(`Invoices: ${invoices}`);
}

checkProgress().finally(() => prisma.$disconnect());
