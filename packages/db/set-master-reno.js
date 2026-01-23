
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setMasterAdmin() {
    const email = 'samuel.leveille.forex@gmail.com';
    try {
        const user = await prisma.user.update({
            where: { email },
            data: {
                divisions: ['EXTERMINATION', 'ENTREPRISES', 'RENOVATION'],
                canManageDivisions: true
            }
        });
        console.log(`Updated user ${email}:`, user);
    } catch (e) {
        console.error("Error updating user:", e);
    }
}

setMasterAdmin()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
