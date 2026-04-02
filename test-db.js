const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const jobs = await prisma.job.findMany({ where: { isDeleted: false }, take: 2, include: { technicians: true } });
        console.log('Successfully fetched jobs! count:', jobs.length);
    } catch (e) {
        console.error('FAILED!', e.message);
    } finally {
        prisma.$disconnect();
    }
}
check();
