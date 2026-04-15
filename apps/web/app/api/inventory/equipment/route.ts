import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";

// GET: Returns equipment assigned to this technician + all available equipment to claim
export async function GET(request: NextRequest) {
    const currentUser = await validateAuth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "userId required" }, { status: 400 });
        }

        // Equipment already assigned to this technician's vehicle
        const assigned = await prisma.inventoryItem.findMany({
            where: {
                userId,
                product: { type: 'EQUIPMENT' }
            },
            include: { product: true }
        });

        // All equipment products available in the system
        const allEquipment = await prisma.product.findMany({
            where: { type: 'EQUIPMENT' },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ assigned, allEquipment });

    } catch (error) {
        console.error("Equipment GET Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST: Technician adds/removes equipment from their vehicle inventory
export async function POST(request: NextRequest) {
    const currentUser = await validateAuth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { userId, productId, quantity = 1, action } = body;

        if (!userId || !productId) {
            return NextResponse.json({ error: "userId and productId required" }, { status: 400 });
        }

        // Verify product is EQUIPMENT type
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product || (product as any).type !== 'EQUIPMENT') {
            return NextResponse.json({ error: "Not an equipment product" }, { status: 400 });
        }

        if (action === 'REMOVE') {
            await prisma.inventoryItem.deleteMany({ where: { userId, productId } });
            return NextResponse.json({ success: true, message: "Equipment removed from vehicle" });
        }

        // Add / claim equipment to vehicle
        await prisma.inventoryItem.upsert({
            where: { productId_userId: { productId, userId } },
            update: { quantity: { increment: quantity } },
            create: { productId, userId, quantity }
        });

        return NextResponse.json({ success: true, message: "Equipment added to vehicle" });

    } catch (error) {
        console.error("Equipment POST Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
