import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// ONE-TIME EMERGENCY SEED ROUTE — DELETE IMMEDIATELY AFTER USE
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('key');
    
    // Require a secret key to prevent abuse
    if (secret !== 'praxis-restore-2024') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const email = 'samuel.leveille.forex@gmail.com';
    const password = 'Admin1234!';

    try {
        const hashed = await bcrypt.hash(password, 12);
        
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            await prisma.user.update({
                where: { email },
                data: { password: hashed, isActive: true, role: 'ADMIN' }
            });
            return NextResponse.json({ message: 'Password reset', email, password });
        }

        const user = await prisma.user.create({
            data: {
                name: 'Samuel Léveillé',
                email,
                password: hashed,
                role: 'ADMIN',
                isActive: true,
            }
        });
        return NextResponse.json({ message: 'Admin created', email: user.email, password });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
