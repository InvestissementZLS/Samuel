import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('key') !== 'praxis-2024-restore') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const email = 'samuel.leveille.forex@gmail.com';
    const password = 'Admin1234!';
    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
        where: { email },
        update: { password: hashed, isActive: true, role: 'ADMIN', name: 'Samuel Léveillé' },
        create: { name: 'Samuel Léveillé', email, password: hashed, role: 'ADMIN', isActive: true }
    });

    return NextResponse.json({ ok: true, email: user.email, role: user.role });
}
