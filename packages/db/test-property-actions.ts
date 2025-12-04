import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing property actions...');
    try {
        // Setup: Create a Client
        const client = await prisma.client.create({
            data: {
                name: 'Test Client Property',
                email: 'test-prop@example.com',
            },
        });
        console.log('Setup: Client created:', client.id);

        // 1. Create a Property
        console.log('Creating test property...');
        const property = await prisma.property.create({
            data: {
                clientId: client.id,
                address: '123 Test Property Lane',
                type: 'RESIDENTIAL',
                accessInfo: 'Gate code: 1234',
            },
        });
        console.log('Property created:', property.id);

        // 2. Update the Property
        console.log('Updating test property...');
        const updatedProperty = await prisma.property.update({
            where: { id: property.id },
            data: {
                address: '456 Updated Lane',
                type: 'COMMERCIAL',
            },
        });
        console.log('Property updated:', updatedProperty.address, updatedProperty.type);

        // 3. Fetch Properties (Read)
        const properties = await prisma.property.findMany({
            where: { clientId: client.id },
        });
        console.log('Properties fetched:', properties.length);

        // 4. Delete the Property
        console.log('Deleting test property...');
        await prisma.property.delete({
            where: { id: property.id },
        });
        console.log('Property deleted');

        // Cleanup
        await prisma.client.delete({ where: { id: client.id } });
        console.log('Cleanup: Client deleted');

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
