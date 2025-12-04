import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing technician actions...');
    try {
        // 1. Create a Technician
        console.log('Creating test technician...');
        const tech = await prisma.user.create({
            data: {
                name: 'Test Tech',
                email: 'test-tech@example.com',
                role: 'TECHNICIAN',
            },
        });
        console.log('Technician created:', tech.id);

        // 2. Update the Technician
        console.log('Updating test technician...');
        const updatedTech = await prisma.user.update({
            where: { id: tech.id },
            data: {
                name: 'Updated Test Tech',
            },
        });
        console.log('Technician updated:', updatedTech.name);

        // 3. Fetch Technicians (Read)
        const technicians = await prisma.user.findMany({
            where: { role: 'TECHNICIAN' },
        });
        console.log('Technicians fetched:', technicians.length);

        // 4. Delete the Technician
        console.log('Deleting test technician...');
        await prisma.user.delete({
            where: { id: tech.id },
        });
        console.log('Technician deleted');

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
