
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listAdmins() {
    const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true, name: true, role: true, divisions: true }
    });

    console.log('Current Admins:');
    console.table(admins);
}

listAdmins()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
