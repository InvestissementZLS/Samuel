import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";
import { validateAuth } from "@/lib/auth";
import { DailyRunPayloadSchema } from "@/lib/run-schema";

export async function GET(request: Request) {
    const currentUser = await validateAuth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const techId = searchParams.get("techId");

    if (!techId) {
        return NextResponse.json(
            { error: "Technician ID is required" },
            { status: 400 }
        );
    }

    try {
        const dateParam = searchParams.get("date");
        const targetDate = dateParam ? new Date(dateParam) : new Date();
        const updatedSinceParam = searchParams.get("updatedSince"); // Delta Sync param
        
        const scheduledWhere = {
             gte: startOfDay(targetDate),
             lte: endOfDay(targetDate),
        };

        const baseWhere: any = {
             technicians: { some: { id: techId } },
             scheduledAt: scheduledWhere,
        };

        if (updatedSinceParam) {
            // Delta Sync: fetch all modified since last sync (including soft-deleted)
            baseWhere.updatedAt = { gte: new Date(updatedSinceParam) };
        } else {
            // Full Sync: only fetch active records
            baseWhere.isDeleted = false;
        }

        const rawJobs = await prisma.job.findMany({
            where: baseWhere,
            select: {
                id: true,
                scheduledAt: true,
                status: true,
                description: true,
                isDeleted: true,
                property: {
                    select: {
                        address: true,
                        client: {
                            select: {
                                name: true,
                                phone: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                scheduledAt: "asc",
            },
        });

        // Translate Prisma output to DailyRunSchema strictly
        const mappedJobs = rawJobs.map(job => ({
            id: job.id,
            scheduledAt: job.scheduledAt.toISOString(),
            status: job.status,
            description: job.description,
            isDeleted: job.isDeleted,
            property: job.property ? {
               address: job.property.address,
               client: job.property.client ? {
                  name: job.property.client.name,
                  phone: job.property.client.phone
               } : null
            } : null
        }));

        // PAYLOAD VALIDATION: Ensure we don't send corrupted or misaligned data
        const safePayload = DailyRunPayloadSchema.parse(mappedJobs);

        return NextResponse.json(safePayload);
    } catch (error) {
        console.error("Error fetching jobs:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
