import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const clients = await prisma.client.findMany();
    const nameMap = new Map<string, number>();

    clients.forEach(c => {
        const name = c.name.trim(); // Normalize slightly
        nameMap.set(name, (nameMap.get(name) || 0) + 1);
    });

    console.log("Duplicate Clients:");
    for (const [name, count] of nameMap.entries()) {
        if (count > 1) {
            console.log(`${name}: ${count}`);
        }
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
