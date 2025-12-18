import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    try {
        const activeEntry = await prisma.timesheetEntry.findFirst({
            where: {
                userId,
                status: 'OPEN',
            },
            orderBy: {
                startTime: 'desc',
            },
        });

        return NextResponse.json(activeEntry);
    } catch (error) {
        console.error("Error fetching timesheet:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, action, latitude, longitude } = body;

        if (!userId || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (action === 'PUNCH_IN') {
            // Check if already open
            const existingOpen = await prisma.timesheetEntry.findFirst({
                where: { userId, status: 'OPEN' }
            });

            if (existingOpen) {
                return NextResponse.json({ error: "You are already punched in" }, { status: 400 });
            }

            const entry = await prisma.timesheetEntry.create({
                data: {
                    userId,
                    startTime: new Date(),
                    startLat: latitude,
                    startLng: longitude,
                    status: 'OPEN',
                }
            });
            return NextResponse.json(entry);

        } else if (action === 'PUNCH_OUT') {
            const activeEntry = await prisma.timesheetEntry.findFirst({
                where: { userId, status: 'OPEN' }
            });

            if (!activeEntry) {
                return NextResponse.json({ error: "No active shift found" }, { status: 400 });
            }

            const endTime = new Date();
            const duration = Math.round((endTime.getTime() - new Date(activeEntry.startTime).getTime()) / 60000); // Minutes

            const entry = await prisma.timesheetEntry.update({
                where: { id: activeEntry.id },
                data: {
                    endTime,
                    endLat: latitude,
                    endLng: longitude,
                    status: 'SUBMITTED',
                    duration,
                }
            });
            return NextResponse.json(entry);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error) {
        console.error("Error processing punch:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
