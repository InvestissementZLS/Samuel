const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'samuel.leveille.forex@gmail.com';
    const password = '12345';

    console.log(`Checking user: ${email}`);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.log('User not found!');
        return;
    }

    console.log('User found:', { id: user.id, email: user.email, hasPassword: !!user.password });

    if (!user.password) {
        console.log('No password set!');
        return;
    }
    
    console.log('Password Hash starts with $2?', user.password.startsWith('$2'));

    const isValid = await bcrypt.compare(password, user.password);
    console.log(`Password is valid for '${password}'?`, isValid);

    // Let's reset it one more time with a specific salt just in case
    if (!isValid) {
         console.log('Resetting password strictly with bcryptjs...');
         const hashed = await bcrypt.hash(password, 10); // Standard cost
         await prisma.user.update({
             where: { email },
             data: { password: hashed }
         });
         console.log('Password strictly reset.');
         const finalCheck = await bcrypt.compare(password, hashed);
         console.log('Strict hash valid?', finalCheck);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
