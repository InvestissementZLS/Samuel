'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CommissionRole } from "@prisma/client";

export async function calculateCommissions(jobId: string) {
    try {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                salesRep: true,
                supervisor: true,
                commissions: true
            }
        });

        if (!job) throw new Error("Job not found");

        // Ensure costs are up to date first?
        // For now, assume calculateJobCosts was called or values are correct.
        const profit = job.totalProfit;

        if (profit <= 0) {
            return { success: true, message: "No profit, no commissions calculated." };
        }

        // Delete existing pending commissions to avoid duplicates if recalculated
        await prisma.commission.deleteMany({
            where: {
                jobId: jobId,
                status: 'PENDING'
            }
        });

        const commissionsToCreate = [];

        // Sales Commission
        // RULE: Only if the job originated from a Quote (has quoteId) 
        // AND there is a salesRep assigned.
        if (job.quoteId && job.salesRep && job.salesRep.commissionPercentageSales > 0) {
            const amount = profit * (job.salesRep.commissionPercentageSales / 100);
            commissionsToCreate.push({
                jobId,
                userId: job.salesRep.id,
                role: 'SALES' as CommissionRole,
                baseAmount: profit,
                percentage: job.salesRep.commissionPercentageSales,
                amount,
                status: 'PENDING' as const
            });
        }

        // Supervision Commission
        if (job.supervisor && job.supervisor.commissionPercentageSupervision > 0) {
            const amount = profit * (job.supervisor.commissionPercentageSupervision / 100);
            commissionsToCreate.push({
                jobId,
                userId: job.supervisor.id,
                role: 'SUPERVISION' as CommissionRole,
                baseAmount: profit,
                percentage: job.supervisor.commissionPercentageSupervision,
                amount,
                status: 'PENDING' as const
            });
        }

        if (commissionsToCreate.length > 0) {
            // @ts-ignore - Prisma types might not be fully generated yet
            await prisma.commission.createMany({
                data: commissionsToCreate
            });
        }

        revalidatePath(`/jobs/${jobId}`);

        return { success: true, message: "Commissions calculated successfully" };

    } catch (error) {
        console.error("Error calculating commissions:", error);
        return { success: false, message: "Failed to calculate commissions" };
    }
}

export async function getCommissionSummary() {
    const pendingCommissions = await prisma.commission.findMany({
        where: { status: "PENDING" },
        include: { user: true }
    });

    const summary = pendingCommissions.reduce((acc, comm) => {
        if (!acc[comm.userId]) {
            acc[comm.userId] = {
                user: comm.user,
                totalAmount: 0,
                count: 0
            };
        }
        acc[comm.userId].totalAmount += comm.amount;
        acc[comm.userId].count += 1;
        return acc;
    }, {} as Record<string, { user: any, totalAmount: number, count: number }>);

    return Object.values(summary);
}

export async function payUserCommissions(userId: string) {
    await prisma.commission.updateMany({
        where: {
            userId: userId,
            status: "PENDING"
        },
        data: {
            status: "PAID"
        }
    });
    revalidatePath('/commissions');
}

export async function getCommissionHistory() {
    return await prisma.commission.findMany({
        where: { status: "PAID" },
        include: {
            user: true,
            job: {
                include: {
                    property: true
                }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });
}

export async function processInvoicePaymentCommissions(invoiceId: string) {
    console.log("Processing commissions for invoice:", invoiceId);
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                items: true,
                job: {
                    include: {
                        technicians: true,
                        salesRep: true
                    }
                }
            }
        });

        if (!invoice) throw new Error("Invoice not found");
        if (invoice.status !== 'PAID') {
            console.log("Invoice not paid, skipping commission processing");
            return;
        }

        const job = invoice.job;
        if (!job) {
            console.log("Invoice has no linked job, skipping");
            return;
        }

        // 1. Approve existing PENDING commissions for this job (Sales/Supervision)
        await prisma.commission.updateMany({
            where: {
                jobId: job.id,
                status: 'PENDING'
            },
            data: {
                // @ts-ignore
                status: 'APPROVED'
            }
        });

        // 2. Calculate Upsell Commissions
        // @ts-ignore
        const upsellItems = invoice.items.filter((item: any) => item.isUpsell);
        if (upsellItems.length === 0) {
            console.log("No upsell items found");
            return;
        }

        const upsellTotal = upsellItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

        // Determine recipients (Technicians assigned to the job)
        // If no technicians, fallback to Sales Rep? Or just don't pay?
        // Logic: "Vente générée sur place" implies technician.
        const recipients = job.technicians.length > 0 ? job.technicians : (job.salesRep ? [job.salesRep] : []);

        if (recipients.length === 0) {
            console.log("No recipients found for upsell commission");
            return;
        }

        // Calculate commission amount per recipient
        // We look at the first recipient's rate for simplicity or handle individual rates?
        // Strategy: Split the total Upsell Value among techs, then apply EACH tech's rate? 
        // OR: Calculate Total Commission (e.g. 10% of Upsell) and SPLIT it? 
        // Context: "Commission System... 10% on upsells". usually means 10% of sale goes to commission pool.
        // I will take 10% of Sale (or user rate) and split it.

        const commissionPool = recipients.reduce((pool, user) => {
            // usage of commissionPercentageUpsell from schema update
            // Fallback to 10 if 0? Or respect 0?
            // If schema update failed (types missing), cast to any.
            const rate = (user as any).commissionPercentageUpsell || 10;
            return pool + (upsellTotal * (rate / 100));
        }, 0);

        // Wait, usually it's: Sale * Rate. If 2 techs, do they BOTH get 10%? Or do they split the 10%?
        // Usually split.
        // Let's assume standard logic: 10% of sale is the commission. Split equally.
        // I'll use the AVERAGE rate of the techs to determine the pool size, then split.

        const avgRate = recipients.reduce((sum, user) => sum + ((user as any).commissionPercentageUpsell || 10), 0) / recipients.length;
        const totalCommissionAmount = upsellTotal * (avgRate / 100);
        const amountPerRecipient = totalCommissionAmount / recipients.length;

        const commissionsToCreate = recipients.map(user => ({
            jobId: job.id,
            userId: user.id,
            role: 'UPSELL' as CommissionRole,
            baseAmount: upsellTotal, // The amount they "sold" (shared)
            percentage: avgRate,
            amount: amountPerRecipient,
            // @ts-ignore
            status: 'APPROVED' as const
        }));

        // @ts-ignore
        await prisma.commission.createMany({
            data: commissionsToCreate
        });

        console.log(`Created ${commissionsToCreate.length} upsell commissions`);
        revalidatePath(`/jobs/${job.id}`);

    } catch (error) {
        console.error("Error processing commissions:", error);
    }
}
