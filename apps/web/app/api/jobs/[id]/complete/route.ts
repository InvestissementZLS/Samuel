import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { signature, isClientUnreachable, notes } = body;

        // VALIDATION: Must have either Signature or be Unreachable
        if (!signature && !isClientUnreachable) {
            return NextResponse.json(
                { error: "Job completion requires either a Signature or 'Client Not Home' confirmation." },
                { status: 400 }
            );
        }

        const jobId = params.id;

        // Transaction to ensure atomic updates for Status, Invoice, and Commission
        await prisma.$transaction(async (tx) => {
            // 1. Get current job with Quote and SalesRep info
            const job = await tx.job.findUnique({
                where: { id: jobId },
                include: {
                    quote: {
                        include: { items: true } // Need items for invoice generation
                    },
                    salesRep: true,
                    supervisor: true // Fetch Supervisor
                }
            });

            if (!job) throw new Error("Job not found");

            // 2. Update Job Status & Proofs
            await tx.job.update({
                where: { id: jobId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    signature: signature || null,
                    isClientUnreachable: !!isClientUnreachable
                }
            });

            // 3. Handle Notes
            if (notes && typeof notes === 'string' && notes.trim().length > 0) {
                await tx.jobNote.create({
                    data: {
                        jobId: jobId,
                        content: `[COMPLETION REPORT] ${notes}`
                    }
                });
            }

            // 4. Automatic Invoicing & Commission Logic
            // Only trigger if linked to a Quote and not already triggered
            if (job.quote && !job.invoiceTriggered) {

                // A. Generate Invoice from Quote (simplistic mapping)
                const invoice = await tx.invoice.create({
                    data: {
                        clientId: job.quote.clientId,
                        jobId: job.id,
                        status: 'SENT',
                        total: job.quote.total,
                        items: {
                            create: job.quote.items.map(item => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                price: item.price,
                                description: item.description
                            }))
                        }
                    }
                });

                // --- COMMISSION LOGIC ---

                // B. Sales Commission (on REVENUE)
                // If the Sales Rep is defined, they get X% of the Total Sale
                if (job.quote.salesRepId) {
                    const salesRep = await tx.user.findUnique({ where: { id: job.quote.salesRepId } });

                    if (salesRep) {
                        const salesRate = salesRep.commissionPercentageSales || 0;
                        const salesCommission = (job.quote.total * salesRate) / 100;

                        if (salesCommission > 0) {
                            await tx.commission.create({
                                data: {
                                    jobId: job.id,
                                    userId: salesRep.id,
                                    role: 'SALES',
                                    baseAmount: job.quote.total,
                                    percentage: salesRate,
                                    amount: salesCommission,
                                    status: 'PENDING'
                                }
                            });
                        }
                    }
                }

                // C. Supervision Commission (on PROFIT)
                // Profit = Revenue - Total Cost (Job.totalJobCost must be populated, assumed 0 if strictly service)
                // Defaulting cost to 0 if not tracked yet, user implied profit logic.
                const revenue = job.quote.total;
                const cost = job.totalJobCost || 0;
                const profit = revenue - cost;

                if (job.supervisorId && profit > 0) {
                    // Start fresh fetch for supervisor to get latest rates if needed (already fetched in step 1 though)
                    const supervisor = job.supervisor || await tx.user.findUnique({ where: { id: job.supervisorId } });

                    if (supervisor) {
                        const supervisionRate = supervisor.commissionPercentageSupervision || 0;
                        const supervisionCommission = (profit * supervisionRate) / 100;

                        if (supervisionCommission > 0) {
                            await tx.commission.create({
                                data: {
                                    jobId: job.id,
                                    userId: supervisor.id,
                                    role: 'SUPERVISION',
                                    baseAmount: profit, // Calculated on Profit
                                    percentage: supervisionRate,
                                    amount: supervisionCommission,
                                    status: 'PENDING'
                                }
                            });
                        }
                    }
                }

                // Mark as triggered so we don't duplicate on re-completion
                await tx.job.update({
                    where: { id: job.id },
                    data: { invoiceTriggered: true }
                });
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Job Completion Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
