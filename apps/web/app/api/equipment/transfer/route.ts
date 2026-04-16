import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/equipment/transfer
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { assetId, destinationType, destinationId, notes, userId } = body;

        if (!assetId || !destinationType || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify asset exists
        const asset = await prisma.equipmentAsset.findUnique({
            where: { id: assetId }
        });

        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        // Apply transfer
        let updateData: any = {
            locationUserId: null,
            locationClientId: null
        };

        if (destinationType === 'CLIENT') {
            updateData.locationClientId = destinationId;
        } else if (destinationType === 'TECH') {
            updateData.locationUserId = destinationId; // Usually transfer to self or empty to put in truck
        }

        // Add history record for the transfer
        const updatedAsset = await prisma.$transaction(async (tx) => {
            const result = await tx.equipmentAsset.update({
                where: { id: assetId },
                data: updateData,
                include: {
                    product: { select: { name: true, isClientDeployable: true } },
                    locationClient: { select: { name: true } },
                    locationUser: { select: { name: true } }
                }
            });

            // If we had a table for equipment transfer history, we'd add it here.
            
            return result;
        });

        return NextResponse.json({ success: true, asset: updatedAsset });
    } catch (error) {
        console.error('Failed to transfer equipment:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
