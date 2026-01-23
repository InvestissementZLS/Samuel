
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateManolo() {
    try {
        // Find Manolo first to get ID
        const manolo = await prisma.user.findFirst({
            where: { name: { contains: 'Manolo', mode: 'insensitive' } }
        });

        if (!manolo) {
            console.log('Manolo not found');
            return;
        }

        const updated = await prisma.user.update({
            where: { id: manolo.id },
            data: {
                divisions: ['EXTERMINATION', 'ENTREPRISES'], // Give access to both
                // role: 'ADMIN' // Currently global. If user wants him to be admin, he is admin everywhere.
                // We will explain this limitation.
            }
        });
        console.log(`Updated Manolo (${manolo.email}):`, updated.divisions);
    } catch (e) {
        console.error("Error updating user:", e);
    }
}

updateManolo()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
