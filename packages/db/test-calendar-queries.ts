import { PrismaClient, JobStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing database connection...');
    try {
        // 1. Ensure we have a Client and Property
        let client = await prisma.client.findFirst();
        if (!client) {
            console.log('Creating test client...');
            client = await prisma.client.create({
                data: {
                    name: 'Test Client',
                    email: 'test@example.com',
                    billingAddress: '123 Test St',
                },
            });
        }

        let property = await prisma.property.findFirst({ where: { clientId: client.id } });
        if (!property) {
            console.log('Creating test property...');
            property = await prisma.property.create({
                data: {
                    clientId: client.id,
                    address: '123 Test St',
                    type: 'RESIDENTIAL',
                },
            });
        }

        // 2. Create a Job
        console.log('Creating test job...');
        const job = await prisma.job.create({
            data: {
                propertyId: property.id,
                description: 'Test Job',
                scheduledAt: new Date(),
                scheduledEndAt: new Date(Date.now() + 3600000), // +1 hour
                status: 'SCHEDULED',
            },
        });
        console.log('Job created:', job.id);

        // 3. Update the Job
        console.log('Updating test job...');
        const updatedJob = await prisma.job.update({
            where: { id: job.id },
            data: {
                description: 'Updated Test Job',
                status: 'IN_PROGRESS',
            },
        });
        console.log('Job updated:', updatedJob.description, updatedJob.status);

        // 4. Fetch Jobs (Read)
        const jobs = await prisma.job.findMany({
            where: { id: job.id },
            include: {
                property: {
                    include: {
                        client: true,
                    },
                },
            },
        });
        console.log('Jobs fetched:', jobs.length);

        // 5. Delete the Job
        console.log('Deleting test job...');
        await prisma.job.delete({
            where: { id: job.id },
        });
        console.log('Job deleted');

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
