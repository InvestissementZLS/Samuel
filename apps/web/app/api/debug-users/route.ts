import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const users = await prisma.user.findMany({});
        return NextResponse.json(users);
    } catch(e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
