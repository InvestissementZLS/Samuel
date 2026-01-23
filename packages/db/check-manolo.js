
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkManolo() {
    // Searching for Manolo/users to see his current state
    const users = await prisma.user.findMany({
        where: {
            name: { contains: 'Manolo', mode: 'insensitive' }
        },
        select: { id: true, name: true, email: true, divisions: true, canManageDivisions: true }
    });

    console.log('Found Users matching "Manolo":');
    console.table(users);
}

checkManolo()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
