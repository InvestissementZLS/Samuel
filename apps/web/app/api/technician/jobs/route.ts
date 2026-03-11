import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";

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
        const today = new Date();
        const jobs = await prisma.job.findMany({
            where: {
                technicians: {
                    some: {
                        id: techId,
                    },
                },
                scheduledAt: {
                    gte: startOfDay(today),
                    lte: endOfDay(today),
                }
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
