import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const currentUser = await validateAuth(request);
        
        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { pushToken } = body;

        if (!pushToken) {
            return NextResponse.json({ error: "pushToken is required" }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: currentUser.id },
            data: { expoPushToken: pushToken }
        });

        return NextResponse.json({ success: true });
        
    } catch (error) {
        console.error("Update Push Token Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
