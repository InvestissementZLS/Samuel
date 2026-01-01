import { NextRequest, NextResponse } from "next/server";
import { transferStock } from "@/app/actions/inventory-actions";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, items } = body;
        // items: { productId, quantity }[]
        // For now, assuming mobile sends one item at a time or list? 
        // Logic below handles single item for simplicity or loop for list. 
        // Let's support list for "Batch Return".

        if (!userId || !items || !Array.isArray(items)) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        const results = [];

        for (const item of items) {
            // Return to Warehouse (toUserId = null)
            const result = await transferStock(
                item.productId,
                userId, // From Technician
                null,   // To Warehouse
                Number(item.quantity)
            );
            results.push(result);
        }

        // Check if any failed
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
            return NextResponse.json({
                error: "Some transfers failed",
                details: failures
            }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Transfer API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
