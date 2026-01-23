
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUser() {
    const email = 'samuel.leveille.forex@gmail.com';
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.log(`User ${email} not found.`);
    } else {
        console.log(`User ${email} found.`);
        console.log('Divisions:', user.divisions);
    }
}

checkUser()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
