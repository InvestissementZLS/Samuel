import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const techId = searchParams.get("techId");

    if (!techId) {
        return NextResponse.json(
            { error: "Technician ID is required" },
            { status: 400 }
        );
    }

    try {
        const jobs = await prisma.job.findMany({
            where: {
                technicians: {
                    some: {
                        id: techId,
                    },
                },
            },
            include: {
                property: {
                    include: {
                        client: true,
                    },
                },
            },
            orderBy: {
                scheduledAt: "asc",
            },
        });

        return NextResponse.json(jobs);
    } catch (error) {
        console.error("Error fetching jobs:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
