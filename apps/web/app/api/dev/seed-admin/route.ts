import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// TEMPORARY SEED ROUTE - DELETE AFTER USE
export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        // Allow only with secret key
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const email = 'samuel.leveille.forex@gmail.com';
    const password = 'Admin1234!';

    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            // Just update the password
            const hashed = await bcrypt.hash(password, 12);
            await prisma.user.update({
                where: { email },
                data: { password: hashed, isActive: true, role: 'ADMIN' }
            });
            return NextResponse.json({ message: 'Password reset for existing user', email });
        }

        const hashed = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: {
                name: 'Samuel Léveillé',
                email,
                password: hashed,
                role: 'ADMIN',
                isActive: true,
            }
        });
        return NextResponse.json({ message: 'Admin created', email: user.email });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
