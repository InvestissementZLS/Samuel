import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/commissions
// Fetch all commissions with related User and Job info
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const whereClause: any = {};
        if (status) {
            whereClause.status = status;
        }

        const commissions = await prisma.commission.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { name: true, email: true }
                },
                job: {
                    include: { property: { include: { client: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate Totals
        const totalPending = commissions
            .filter(c => c.status === 'PENDING')
            .reduce((sum, c) => sum + c.amount, 0);

        const totalPaid = commissions
            .filter(c => c.status === 'PAID')
            .reduce((sum, c) => sum + c.amount, 0);

        return NextResponse.json({
            items: commissions,
            summary: {
                pending: totalPending,
                paid: totalPaid,
            }
        });

    } catch (error) {
        console.error("Error fetching commissions:", error);
        return NextResponse.json({ error: "Failed to fetch commissions" }, { status: 500 });
    }
}

// PATCH /api/commissions
// Update status of a commission (or bulk update)
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ids, status } = body;

        // Bulk Update
        if (ids && Array.isArray(ids)) {
            await prisma.commission.updateMany({
                where: { id: { in: ids } },
                data: { status }
            });
            return NextResponse.json({ success: true, count: ids.length });
        }

        // Single Update
        if (id) {
            await prisma.commission.update({
                where: { id },
                data: { status }
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Missing ID(s)" }, { status: 400 });

    } catch (error) {
        console.error("Error updating commission:", error);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}
