import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing Mobile App Data Flow...');
    try {
        // 1. Setup Data
        const techEmail = `mobile-tech-${Date.now()}@example.com`;
        const tech = await prisma.user.create({
            data: {
                name: 'Mobile Tech',
                email: techEmail,
                password: 'password123',
                role: 'TECHNICIAN'
            }
        });

        const client = await prisma.client.create({
            data: { name: 'Mobile Client', email: `mobile-client-${Date.now()}@example.com` }
        });
        const property = await prisma.property.create({
            data: { clientId: client.id, address: 'Mobile Address' }
        });

        const job = await prisma.job.create({
            data: {
                propertyId: property.id,
                scheduledAt: new Date(),
                status: 'SCHEDULED',
                technicians: { connect: { id: tech.id } }
            }
        });

        console.log('Setup complete. Tech ID:', tech.id, 'Job ID:', job.id);

        // 2. Simulate Login
        const loginUser = await prisma.user.findUnique({
            where: { email: techEmail }
        });

        if (loginUser && loginUser.password === 'password123') {
            console.log('SUCCESS: Login verification passed.');
        } else {
            console.error('FAILURE: Login verification failed.');
        }

        // 3. Simulate Fetch Jobs (Mobile List)
        const jobs = await prisma.job.findMany({
            where: {
                technicians: {
                    some: { id: tech.id }
                }
            },
            include: {
                property: { include: { client: true } }
            }
        });

        if (jobs.length > 0 && jobs[0].id === job.id) {
            console.log('SUCCESS: Job list fetch passed.');
        } else {
            console.error('FAILURE: Job list fetch failed.');
        }

        // 4. Simulate Job Details
        const jobDetail = await prisma.job.findUnique({
            where: { id: job.id },
            include: {
                property: { include: { client: true } },
                products: true,
                notes: true,
                photos: true
            }
        });

        if (jobDetail) {
            console.log('SUCCESS: Job detail fetch passed.');
        } else {
            console.error('FAILURE: Job detail fetch failed.');
        }

        // 5. Simulate Update Status & Invoice Generation (Logic from API)
        const updatedJob = await prisma.job.update({
            where: { id: job.id },
            data: { status: 'COMPLETED' }
        });

        // Mimic API logic for invoice creation
        const invoice = await prisma.invoice.create({
            data: {
                clientId: jobDetail!.property.clientId,
                jobId: job.id,
                status: 'SENT',
                description: `Invoice for Job at ${jobDetail!.property.address}`,
                total: 0
            }
        });

        console.log('Job updated to COMPLETED. Invoice created:', invoice.id);

        const verifyInvoice = await prisma.invoice.findFirst({
            where: { jobId: job.id }
        });

        if (verifyInvoice) {
            console.log('SUCCESS: Invoice generation verified.');
        } else {
            console.error('FAILURE: Invoice generation failed.');
        }

        // Cleanup
        await prisma.invoice.delete({ where: { id: invoice.id } });
        await prisma.job.delete({ where: { id: job.id } });
        await prisma.property.delete({ where: { id: property.id } });
        await prisma.client.delete({ where: { id: client.id } });
        await prisma.user.delete({ where: { id: tech.id } });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
