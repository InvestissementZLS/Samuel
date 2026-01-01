import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            where: {
                type: { not: 'SERVICE' } // Only physical products usually
            },
            select: {
                id: true,
                name: true,
                unit: true,
                type: true
            },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(products);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}
