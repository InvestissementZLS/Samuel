import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'samuel.leveille.forex@gmail.com';
    const password = '12345';

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { password },
        });
        console.log(`Password updated for user: ${user.email}`);
    } catch (error) {
        console.error('Error updating password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
