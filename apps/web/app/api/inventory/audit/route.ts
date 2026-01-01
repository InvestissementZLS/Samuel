import { NextRequest, NextResponse } from "next/server";
import { getInventory, submitAudit } from "@/app/actions/inventory-actions";
import { prisma } from "@/lib/prisma";

// GET: Fetch technician's current inventory (Expected Stock)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "userId required" }, { status: 400 });
        }

        const result = await getInventory(userId);

        if (result.success) {
            return NextResponse.json(result.data);
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST: Submit an Audit Report
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, items } = body; // items: { productId, actualQuantity, notes? }[]

        if (!userId || !items || !Array.isArray(items)) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        const result = await submitAudit(userId, items);

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: result.message }, { status: 500 });
        }

    } catch (error) {
        console.error("Audit API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
