import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/equipment?userId=XYZ
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
        }

        const assets = await prisma.equipmentAsset.findMany({
            where: { locationUserId: userId },
            include: {
                product: {
                    select: {
                        name: true,
                        isClientDeployable: true
                    }
                }
            },
            orderBy: [ { product: { name: 'asc' } }, { assetTag: 'asc' } ]
        });

        // Séparer les cages/caméras (déployables) des outils (non déployables)
        const deployable = assets.filter(a => a.product.isClientDeployable);
        const tools = assets.filter(a => !a.product.isClientDeployable);

        return NextResponse.json({ deployable, tools });
    } catch (error) {
        console.error('Failed to get user equipment', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
