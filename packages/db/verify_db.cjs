const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const url = process.env.DATABASE_URL;
        console.log("DB string starts with:", url ? url.substring(0, 20) : "UNDEFINED");
        
        const users = await prisma.user.findMany({
            select: { email: true, role: true, isActive: true }
        });
        console.log(`TOTAL USERS: ${users.length}`);
        console.log(users);
    } catch(e) {
        console.error("error", e);
    } finally {
        await prisma.$disconnect();
    }
}
check();
