import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { JobStatus } from "@prisma/client";
import { sendEmail } from "@/lib/email-service";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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

        // Automation: Send Invoice on Completion
        if (status === 'COMPLETED') {
            // Check if invoice already exists
            const existingInvoice = await prisma.invoice.findFirst({
                where: { jobId: job.id },
            });

            if (!existingInvoice) {
                // Create new invoice
                const newInvoice = await prisma.invoice.create({
                    data: {
                        clientId: job.property.clientId,
                        jobId: job.id,
                        status: 'SENT',
                        description: `Invoice for Job at ${job.property.address}`,
                        total: 0, // In a real app, we'd calculate this from job products/services
                    },
                });

                // Send Email
                const clientEmail = job.property.client.email;
                if (clientEmail) {
                    await sendEmail(
                        clientEmail,
                        `Invoice for Job at ${job.property.address}`,
                        `Dear ${job.property.client.name},\n\nYour job has been completed. An invoice (ID: ${newInvoice.id}) has been generated.\n\nPlease log in to the portal to view and pay.\n\nThanks,\nZLS Team`
                    );
                }
            }
        }

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
    const { id } = await params;
    try {
        await prisma.job.delete({
            where: { id },
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
