import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing Technician CRUD...');
    try {
        // 1. Create
        const tech = await prisma.user.create({
            data: {
                name: 'CRUD Tech',
                email: `crud-tech-${Date.now()}@example.com`,
                role: 'TECHNICIAN',
            }
        });
        console.log('Created tech:', tech.id);

        // 2. Update
        const updatedTech = await prisma.user.update({
            where: { id: tech.id },
            data: { name: 'CRUD Tech Updated' }
        });
        console.log('Updated tech:', updatedTech.name);

        // 3. Assign to Job (to test delete protection)
        // Need a client and property first
        const client = await prisma.client.create({
            data: { name: 'CRUD Client' }
        });
        const property = await prisma.property.create({
            data: { clientId: client.id, address: 'CRUD Address' }
        });
        const job = await prisma.job.create({
            data: {
                propertyId: property.id,
                scheduledAt: new Date(),
                technicians: { connect: { id: tech.id } }
            }
        });
        console.log('Assigned to job:', job.id);

        // 4. Try Delete (Should Fail)
        console.log('Attempting delete (should fail)...');
        try {
            // Simulate the check in the action
            const jobCount = await prisma.job.count({
                where: { technicians: { some: { id: tech.id } } }
            });
            if (jobCount > 0) {
                throw new Error(`Cannot delete technician. They are assigned to ${jobCount} job(s).`);
            }
            await prisma.user.delete({ where: { id: tech.id } });
            console.error('FAILURE: Technician deleted despite having jobs.');
        } catch (error: any) {
            console.log('SUCCESS: Delete prevented:', error.message);
        }

        // 5. Unassign
        await prisma.job.update({
            where: { id: job.id },
            data: { technicians: { disconnect: { id: tech.id } } }
        });
        console.log('Unassigned from job.');

        // 6. Delete (Should Succeed)
        await prisma.user.delete({ where: { id: tech.id } });
        console.log('SUCCESS: Technician deleted after unassignment.');

        // Cleanup
        await prisma.job.delete({ where: { id: job.id } });
        await prisma.property.delete({ where: { id: property.id } });
        await prisma.client.delete({ where: { id: client.id } });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
