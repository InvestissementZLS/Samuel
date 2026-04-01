const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.user.updateMany({
        where: { role: 'ADMIN' },
        data: {
            canManageDivisions: true,
            divisions: ["EXTERMINATION", "ENTREPRISES", "RENOVATION"]
        }
    });
    console.log('Admin accounts updated with full division access.');
}

main().catch(console.error).finally(() => process.exit(0));
