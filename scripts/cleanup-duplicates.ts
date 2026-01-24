
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for duplicates of Katie Kepron...');

    const clients = await prisma.client.findMany({
        where: {
            OR: [
                { name: { contains: 'Katie Kepron' } },
                { email: { contains: 'atiekepronfitness@gmail.com' } }
            ]
        },
        include: { quotes: true, properties: true }
        // Removed 'jobs' since it's likely on Property not Client directly, or named something else. 
        // Verified schema earlier: Job -> Property -> Client. So client.jobs might not exist or is 'properties'.
    });

    console.log(`Found ${clients.length} clients.`);

    if (clients.length <= 1) {
        console.log('No duplicates found (or only 1).');
        return;
    }

    // Pick the 'master' client
    // Prefer one with the target quote
    let master = clients.find(c => c.quotes.some(q => q.number === 'Q-DEMO-001'));

    if (!master) {
        // If no quote match, pick the one with most properties
        master = clients.reduce((prev, current) => (prev.properties.length > current.properties.length) ? prev : current);
    }

    console.log(`Master Client ID: ${master.id} (${master.name})`);

    const duplicates = clients.filter(c => c.id !== master.id);

    for (const dup of duplicates) {
        console.log(`Processing duplicate ${dup.id}...`);

        // Move records
        if (dup.quotes.length > 0) {
            console.log(`Moving ${dup.quotes.length} quotes...`);
            await prisma.quote.updateMany({
                where: { clientId: dup.id },
                data: { clientId: master.id }
            });
        }

        if (dup.properties.length > 0) {
            console.log(`Moving ${dup.properties.length} properties...`);
            await prisma.property.updateMany({
                where: { clientId: dup.id },
                data: { clientId: master.id }
            });
        }

        // Delete duplicate
        console.log(`Deleting duplicate ${dup.id}...`);
        await prisma.client.delete({ where: { id: dup.id } });
    }

    console.log('Deduplication complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
