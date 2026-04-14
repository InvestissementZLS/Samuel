import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { JobStatus } from "@prisma/client";
import { validateAuth } from "@/lib/auth";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // 🔐 B-03 FIX: Job details include client name, phone, email, address — must be authenticated
    const currentUser = await validateAuth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    try {
        const job = await prisma.job.findUnique({
            where: { id },
            include: {
                property: {
                    include: {
                        client: true,
                    },
                },
                notes: true,
                photos: true,
                products: {
                    include: {
                        product: true
                    }
                },
            },
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        return NextResponse.json(job);
    } catch (error) {
        console.error("Error fetching job:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await validateAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    try {
        const body = await request.json();
        const { status } = body;

        if (!status || !Object.values(JobStatus).includes(status)) {
            return NextResponse.json(
                { error: "Invalid status" },
                { status: 400 }
            );
        }

        const job = await prisma.job.update({
            where: { id },
            data: { status },
            include: {
                property: {
                    include: {
                        client: true,
                    },
                },
            },
        });

        // M-05 FIX: Invoice creation is handled exclusively by /api/jobs/[id]/complete
        // which uses a Prisma transaction + invoiceTriggered flag to prevent duplicates.
        // Do NOT create invoices here to avoid double-billing.

        return NextResponse.json(job);
    } catch (error) {
        console.error("Error updating job:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await validateAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    try {
        await prisma.job.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting job:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
