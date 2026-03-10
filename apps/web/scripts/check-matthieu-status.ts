
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            name: {
                contains: 'Matthieu',
                mode: 'insensitive'
            }
        },
        select: {
            id: true,
            name: true,
            isActive: true,
            divisions: true
        }
    });

    console.log('Found users:', JSON.stringify(users, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
