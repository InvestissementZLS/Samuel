
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying Quote Q-DEMO-001...');

    const quote = await prisma.quote.findFirst({
        where: { number: 'Q-DEMO-001' },
        include: { client: true }
    });

    if (!quote) {
        console.error('Quote Q-DEMO-001 not found!');
        return;
    }

    console.log('Quote ID:', quote.id);
    console.log('Client ID:', quote.clientId);

    if (quote.client) {
        console.log('Client Found:', quote.client.name);
        console.log('Client Address:', quote.client.billingAddress);
        console.log('Client Email:', quote.client.email);
    } else {
        console.error('Client relation is null! (Should not happen with Prisma types unless DB constrained failed or manually checking)');
    }

    // Double check if client actually exists in DB if relation failed via Prisma include (unlikely but possible)
    const clientCheck = await prisma.client.findUnique({
        where: { id: quote.clientId }
    });

    if (!clientCheck) {
        console.error('CRITICAL: Quote points to non-existent client ID:', quote.clientId);

        // Attempt to find the real Katie Kepron
        const realKatie = await prisma.client.findFirst({
            where: { name: { contains: 'Katie Kepron' } }
        });

        if (realKatie) {
            console.log('Found real Katie Kepron:', realKatie.id);
            console.log('Fixing link...');
            await prisma.quote.update({
                where: { id: quote.id },
                data: { clientId: realKatie.id }
            });
            console.log('Link fixed.');
        } else {
            console.error('Could not find any Katie Kepron client!');
        }
    } else {
        console.log('Client record verified in DB.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
