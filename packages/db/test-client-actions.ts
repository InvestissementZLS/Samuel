import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing client actions...');
    try {
        // 1. Create a Client
        console.log('Creating test client...');
        const client = await prisma.client.create({
            data: {
                name: 'Test Client Action',
                email: 'test-client@example.com',
                phone: '555-0123',
                billingAddress: '123 Test St',
            },
        });
        console.log('Client created:', client.id);

        // 2. Update the Client
        console.log('Updating test client...');
        const updatedClient = await prisma.client.update({
            where: { id: client.id },
            data: {
                name: 'Updated Test Client',
                phone: '555-0199',
            },
        });
        console.log('Client updated:', updatedClient.name, updatedClient.phone);

        // 3. Fetch Clients (Read)
        const clients = await prisma.client.findMany({
            where: { email: 'test-client@example.com' },
        });
        console.log('Clients fetched:', clients.length);

        // 4. Delete the Client
        console.log('Deleting test client...');
        await prisma.client.delete({
            where: { id: client.id },
        });
        console.log('Client deleted');

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
