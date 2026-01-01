import { NextRequest, NextResponse } from "next/server";
import { addProductUsed } from "@/app/actions/job-details-actions";

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { productId, quantity } = body;

        if (!productId || !quantity) {
            return NextResponse.json(
                { error: "Missing productId or quantity" },
                { status: 400 }
            );
        }

        // Call the server action which handles DB creation + Inventory Decrement
        await addProductUsed(params.id, productId, Number(quantity));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error adding product usage:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
