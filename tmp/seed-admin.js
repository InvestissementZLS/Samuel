const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@praxiszls.com'; // change if needed
    const password = 'Admin1234!';        // CHANGE AFTER FIRST LOGIN

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log('User already exists:', email);
        process.exit(0);
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
        data: {
            name: 'Admin',
            email,
            password: hashed,
            role: 'ADMIN',
            isActive: true,
        }
    });
    console.log('Admin user created:', user.email);
    console.log('Password:', password);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
