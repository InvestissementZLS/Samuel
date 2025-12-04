import { PrismaClient } from '@prisma/client';
import { optimizeDailyRoute } from '../../apps/web/app/actions/optimization-actions'; // Adjust path if needed, or mock
// Since we can't easily import from apps/web in this standalone script without build setup, 
// we will replicate the logic or just test the query part if possible. 
// However, the best way is to use the actual action if the environment allows.
// Given the project structure (monorepo), importing from apps/web might be tricky in a standalone script run with tsx.
// Let's try to mock the action's logic or just verify the data setup first.

// Actually, let's try to import the action. If it fails, we'll adapt.
// But `apps/web/app/actions/optimization-actions.ts` uses `@/lib/prisma` which is an alias.
// Standalone script won't understand `@/`.
// So we should probably just test the query logic here directly to verify the fix works conceptually,
// OR we can try to run this test within the context of the app if possible.
// For now, let's write a script that replicates the query to prove it works against the DB.

const prisma = new PrismaClient();

async function main() {
    console.log('Testing optimization query...');
    try {
        // 1. Setup Data
        const tech = await prisma.user.create({
            data: {
                name: 'Optimization Tech',
                email: `opt-tech-${Date.now()}@example.com`,
                role: 'TECHNICIAN',
            }
        });
        console.log('Created tech:', tech.id);

        const client = await prisma.client.create({
            data: {
                name: 'Opt Client',
                email: `opt-client-${Date.now()}@example.com`,
            }
        });

        const property = await prisma.property.create({
            data: {
                clientId: client.id,
                address: '123 Opt St',
                latitude: 45.50,
                longitude: -73.56,
            }
        });

        // Create a job assigned to this tech
        const job1 = await prisma.job.create({
            data: {
                propertyId: property.id,
                scheduledAt: new Date(),
                technicians: {
                    connect: { id: tech.id }
                }
            }
        });
        console.log('Created job1:', job1.id);

        // Create a job NOT assigned to this tech
        const job2 = await prisma.job.create({
            data: {
                propertyId: property.id,
                scheduledAt: new Date(),
                // No technicians or different tech
            }
        });
        console.log('Created job2 (unassigned):', job2.id);

        // 2. Test the Query
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const jobs = await prisma.job.findMany({
            where: {
                technicians: {
                    some: {
                        id: tech.id,
                    },
                },
                scheduledAt: {
                    gte: start,
                    lte: end,
                },
                status: {
                    not: 'CANCELLED',
                },
            },
            include: {
                property: true,
            },
        });

        console.log('Jobs found:', jobs.length);

        if (jobs.length === 1 && jobs[0].id === job1.id) {
            console.log('SUCCESS: Query correctly found the assigned job.');
        } else {
            console.error('FAILURE: Query returned unexpected jobs.', jobs);
        }

        // Cleanup
        await prisma.job.deleteMany({ where: { id: { in: [job1.id, job2.id] } } });
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
