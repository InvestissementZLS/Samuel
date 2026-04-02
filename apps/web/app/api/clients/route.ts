import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";

export async function GET(request: Request) {
    const currentUser = await validateAuth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const clients = await prisma.client.findMany({
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                address: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json(clients);
    } catch (error) {
        console.error("Error fetching clients:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
