import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing Job Technician Update...');
    try {
        // 1. Setup Data
        const tech1 = await prisma.user.create({
            data: { name: 'Tech 1', email: `tech1-${Date.now()}@example.com`, role: 'TECHNICIAN' }
        });
        const tech2 = await prisma.user.create({
            data: { name: 'Tech 2', email: `tech2-${Date.now()}@example.com`, role: 'TECHNICIAN' }
        });

        const client = await prisma.client.create({ data: { name: 'Update Client' } });
        const property = await prisma.property.create({ data: { clientId: client.id, address: 'Update Address' } });

        const job = await prisma.job.create({
            data: {
                propertyId: property.id,
                scheduledAt: new Date(),
                technicians: { connect: { id: tech1.id } } // Start with Tech 1
            },
            include: { technicians: true }
        });
        console.log('Created job with:', job.technicians.map(t => t.name).join(', '));

        // 2. Update Technicians (Simulate Action)
        // Action logic: set technicians to new list
        const newTechIds = [tech1.id, tech2.id];

        await prisma.job.update({
            where: { id: job.id },
            data: {
                technicians: {
                    set: newTechIds.map(id => ({ id })),
                },
            },
        });

        const updatedJob = await prisma.job.findUnique({
            where: { id: job.id },
            include: { technicians: true }
        });
        console.log('Updated job technicians:', updatedJob?.technicians.map(t => t.name).sort().join(', '));

        if (updatedJob?.technicians.length === 2) {
            console.log('SUCCESS: Job now has 2 technicians.');
        } else {
            console.error('FAILURE: Job technician count incorrect.');
        }

        // 3. Remove a technician
        const removeTechIds = [tech2.id];
        await prisma.job.update({
            where: { id: job.id },
            data: {
                technicians: {
                    set: removeTechIds.map(id => ({ id })),
                },
            },
        });

        const finalJob = await prisma.job.findUnique({
            where: { id: job.id },
            include: { technicians: true }
        });
        console.log('Final job technicians:', finalJob?.technicians.map(t => t.name).join(', '));

        if (finalJob?.technicians.length === 1 && finalJob.technicians[0].id === tech2.id) {
            console.log('SUCCESS: Job now has only Tech 2.');
        } else {
            console.error('FAILURE: Job technician removal failed.');
        }

        // Cleanup
        await prisma.job.delete({ where: { id: job.id } });
        await prisma.property.delete({ where: { id: property.id } });
        await prisma.client.delete({ where: { id: client.id } });
        await prisma.user.deleteMany({ where: { id: { in: [tech1.id, tech2.id] } } });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
