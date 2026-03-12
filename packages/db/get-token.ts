import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const link = await prisma.bookingLink.findFirst({
        where: { clientId: '1e18e698-8707-4ecb-899d-af6007cf5bd5' }
    });
    console.log(JSON.stringify(link, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
