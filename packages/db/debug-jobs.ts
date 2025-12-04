
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const jobs = await prisma.job.findMany({
            include: {
                property: {
                    include: {
                        client: true,
                    },
                },
                technicians: true,
            },
        });
        console.log('Found jobs:', JSON.stringify(jobs, null, 2));
    } catch (e) {
        console.error('Error fetching jobs:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
