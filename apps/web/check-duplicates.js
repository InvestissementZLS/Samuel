const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
   const clients = await prisma.client.findMany({ 
       where: { isDeleted: false }, 
       include: {
           properties: true,
           invoices: { select: { id: true }},
           quotes: { select: { id: true }}
       } 
   });
   
   const nameMap = new Map();
   let totalDuplicateGroups = 0;
   const duplicatesToPrint = [];

   for (const c of clients) {
       // Normalize name aggressively
       const normalized = c.name.toLowerCase().replace(/\s+/g, ' ').trim();
       
       if (nameMap.has(normalized)) {
           nameMap.get(normalized).push(c);
       } else {
           nameMap.set(normalized, [c]);
       }
   }

   for (const [name, list] of nameMap.entries()) {
       if (list.length > 1) {
           totalDuplicateGroups++;
           if (totalDuplicateGroups <= 15) {
               duplicatesToPrint.push({
                   normalizedName: name,
                   count: list.length,
                   clients: list.map(c => ({
                       id: c.id,
                       name: c.name,
                       createdAt: c.createdAt,
                       invoices: c.invoices.length,
                       quotes: c.quotes.length
                   }))
               });
           }
       }
   }

   const fs = require('fs');
   fs.writeFileSync('duplicates.json', JSON.stringify(duplicatesToPrint, null, 2));
   
   console.log(`Found ${totalDuplicateGroups} names that have duplicate client records.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
