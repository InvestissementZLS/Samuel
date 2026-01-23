
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setMasterAdmin() {
    const email = 'samuel.leveille.forex@gmail.com';
    try {
        const user = await prisma.user.update({
            where: { email },
            data: {
                canManageDivisions: true,
                divisions: ['EXTERMINATION', 'ENTREPRISES'],
                canViewReports: true,
                canManageTimesheets: true,
                canManageExpenses: true,
                canManageUsers: true,
                canManageCommissions: true
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
