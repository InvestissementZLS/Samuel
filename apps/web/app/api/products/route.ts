import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAuth } from '@/lib/auth';

/**
 * GET /api/products
 * Retourne la liste des produits pour l'app mobile (CreateQuoteScreen)
 * Inclut le prix pour le calcul des totaux
 */
export async function GET(request: NextRequest) {
    const currentUser = await validateAuth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const products = await prisma.product.findMany({
            select: {
                id: true,
                name: true,
                unit: true,
                type: true,
                price: true,
            },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(products);
    } catch (error) {
        console.error('[GET /api/products] error:', error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}
