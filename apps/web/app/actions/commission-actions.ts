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
        if (job.salesRep && job.salesRep.commissionPercentageSales > 0) {
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
