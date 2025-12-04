import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing Client Portal Data Fetching...');
    try {
        // 1. Setup Data
        const client = await prisma.client.create({
            data: { name: 'Portal Client', email: `portal-${Date.now()}@example.com` }
        });
        const property = await prisma.property.create({
            data: { clientId: client.id, address: 'Portal Address' }
        });
        const job = await prisma.job.create({
            data: {
                propertyId: property.id,
                scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
                status: 'SCHEDULED'
            }
        });
        const invoice = await prisma.invoice.create({
            data: {
                clientId: client.id,
                status: 'SENT',
                total: 150,
                description: 'Portal Invoice'
            }
        });

        // 2. Fetch Data (Simulate Page Load)
        const fetchedClient = await prisma.client.findUnique({
            where: { id: client.id },
            include: {
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        items: {
                            include: { product: true },
                        },
                    },
                },
                properties: {
                    include: {
                        jobs: {
                            where: {
                                scheduledAt: { gte: new Date() },
                                status: { not: 'CANCELLED' },
                            },
                            orderBy: { scheduledAt: 'asc' },
                            include: {
                                technicians: true,
                                property: true,
                            }
                        }
                    }
                }
            },
        });

        if (!fetchedClient) {
            throw new Error('Client not found');
        }

        console.log('Client fetched:', fetchedClient.name);

        const upcomingJobs = fetchedClient.properties.flatMap(p => p.jobs);
        console.log('Upcoming jobs:', upcomingJobs.length);
        if (upcomingJobs.length > 0 && upcomingJobs[0].property) {
            console.log('Job property address:', upcomingJobs[0].property.address);
        } else {
            console.error('FAILURE: Job property missing.');
        }

        const openInvoices = fetchedClient.invoices.filter(inv => inv.status === 'SENT');
        console.log('Open invoices:', openInvoices.length);

        if (upcomingJobs.length === 1 && openInvoices.length === 1) {
            console.log('SUCCESS: Data fetched correctly.');
        } else {
            console.error('FAILURE: Data count incorrect.');
        }

        // Cleanup
        await prisma.invoice.delete({ where: { id: invoice.id } });
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
