import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching clients...");
    const clients = await prisma.client.findMany({ 
        include: { bookingLinks: true } 
    });
    
    let created = 0;
    for (const c of clients) { 
        if (c.bookingLinks.length === 0) { 
            console.log('Found client with no token:', c.id, c.name); 
            const t = crypto.randomUUID(); 
            const expires = new Date();
            expires.setFullYear(expires.getFullYear() + 2); // Valid 2 years
            
            await prisma.bookingLink.create({ 
                data: { 
                    clientId: c.id, 
                    token: t, 
                    expiresAt: expires
                }
            }); 
            console.log('Created token for', c.name, t); 
            created++;
        } 
    }
    console.log(`Finished. Created ${created} new portal tokens.`);
} 

main().catch(console.error).finally(() => prisma.$disconnect());
