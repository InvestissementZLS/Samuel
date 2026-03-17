import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'samuel.leveille.forex@gmail.com';
    const password = 'Admin1234!';
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { console.log('❌ User NOT found'); return; }
    
    const valid = await bcrypt.compare(password, user.password!);
    console.log('Password valid:', valid);
    console.log('isActive:', user.isActive);
    console.log('role:', user.role);
    
    if (!valid) {
        console.log('Resetting password...');
        const hashed = await bcrypt.hash(password, 12);
        await prisma.user.update({ where: { email }, data: { password: hashed } });
        
        const valid2 = await bcrypt.compare(password, hashed);
        console.log('New hash valid:', valid2);
    }
}

main()
    .catch(e => { console.error(e.message); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
