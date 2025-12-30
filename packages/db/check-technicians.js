
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const technicians = await prisma.user.findMany({
        where: { role: 'TECHNICIAN' },
    });
    console.log('Technicians found:', technicians.length);
    console.log(technicians);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
