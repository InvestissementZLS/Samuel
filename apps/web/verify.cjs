require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const url = process.env.DATABASE_URL;
        console.log("DB URL present:", !!url);
        
        const users = await prisma.user.findMany({ select: { name: true, email: true, role: true, isActive: true, divisions: true }});
        console.log(`TOTAL USERS: ${users.length}`);
        console.log(users);
    } catch(e) {
        console.error("error", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
check();
