
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: {
            email: {
                contains: 'matthieu', // Searching loosely for now as exact email might differ
                mode: 'insensitive'
            }
        },
        include: {
            accesses: true
        }
    });

    if (!user) {
        console.log('User not found');
    } else {
        console.log('User found:', user.email);
        console.log('Can Manage Divisions:', user.canManageDivisions);
        console.log('Divisions Array:', user.divisions);
        console.log('Accesses:', JSON.stringify(user.accesses, null, 2));
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
