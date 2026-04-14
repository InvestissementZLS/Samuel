import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function mergeClients() {
   const clients = await prisma.client.findMany({ 
       where: { isDeleted: false },
       include: {
           properties: true
       }
   });
   
   const nameMap = new Map();

   for (const c of clients) {
       // Normalize name aggressively
       const normalized = c.name.toLowerCase().replace(/\s+/g, ' ').trim();
       if (nameMap.has(normalized)) {
           nameMap.get(normalized).push(c);
       } else {
           nameMap.set(normalized, [c]);
       }
   }

   let mergedCount = 0;

   console.log("🔄 Starting Duplicate Merging Process...");

   for (const [name, list] of nameMap.entries()) {
       if (list.length > 1) {
           // Sort by creation date (oldest first is the master)
           list.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
           const master = list[0];
           
           // The "cleanest" name is usually the newly imported one (last in the list) or the normalized one
           const cleanestName = list[list.length - 1].name.trim();

           // Bring data from all dupes to master
           const dupes = list.slice(1);
           
           for (const dupe of dupes) {
               // Update Master's missing fields
               if (!master.email && dupe.email) master.email = dupe.email;
               if (!master.phone && dupe.phone) master.phone = dupe.phone;
               if (!master.billingAddress && dupe.billingAddress) master.billingAddress = dupe.billingAddress;
               
               // 1. Move Invoices
               await prisma.invoice.updateMany({
                   where: { clientId: dupe.id },
                   data: { clientId: master.id }
               });

               // 2. Move Quotes
               await prisma.quote.updateMany({
                   where: { clientId: dupe.id },
                   data: { clientId: master.id }
               });

               // 3. Move BookingLinks
               await prisma.bookingLink.updateMany({
                   where: { clientId: dupe.id },
                   data: { clientId: master.id }
               });
               
               // 4. Move ClientNotes
               await prisma.clientNote.updateMany({
                   where: { clientId: dupe.id },
                   data: { clientId: master.id }
               });

               // 5. Move Properties (Check if address is exactly same to avoid Unique constraint failure if Property requires unique)
               // However Property has (clientId, id) mostly.
               for (const prop of dupe.properties) {
                   const masterHasProp = master.properties.find((p: any) => p.address === prop.address);
                   if (!masterHasProp) {
                       await prisma.property.update({
                           where: { id: prop.id },
                           data: { clientId: master.id }
                       });
                       master.properties.push(prop); // so next dupe doesnt fail
                   } else {
                       // duplicate property, safely delete
                       await prisma.property.delete({ where: { id: prop.id } });
                   }
               }

               // 6. Delete the Duplicate Client
               await prisma.client.delete({
                   where: { id: dupe.id }
               });
               mergedCount++;
           }

           // 7. Finally update Master Client with any missing info + Clean Name
           await prisma.client.update({
               where: { id: master.id },
               data: {
                   name: cleanestName, // Best looking name
                   email: master.email,
                   phone: master.phone,
                   billingAddress: master.billingAddress,
                   divisions: Array.from(new Set([...master.divisions, ...dupes.flatMap((d: any) => d.divisions)]))
               }
           });
       }
   }

   console.log(`✅ Successfully merged ${mergedCount} duplicate clients!`);
}

mergeClients()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
