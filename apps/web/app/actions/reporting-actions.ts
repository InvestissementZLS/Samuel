'use server';

import { prisma } from '@/lib/prisma';
import { startOfYear, endOfYear, format } from 'date-fns';

export async function getDashboardStats() {
    const now = new Date();
    const start = startOfYear(now);
    const end = endOfYear(now);

    // 1. Total Revenue (Paid + Partial)
    const revenueInvoices = await prisma.invoice.findMany({
        where: {
            OR: [
                { status: 'PAID' },
                { status: 'PARTIALLY_PAID' }
            ]
        },
        select: {
            amountPaid: true,
        },
    });
    const totalRevenue = revenueInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);

    // 2. Job Counts
    const totalJobs = await prisma.job.count();
    const completedJobs = await prisma.job.count({
        where: { status: 'COMPLETED' },
    });
    const scheduledJobs = await prisma.job.count({
        where: { status: 'SCHEDULED' },
    });

    // 3. Revenue by Month (Current Year)
    const invoicesThisYear = await prisma.invoice.findMany({
        where: {
            OR: [
                { status: 'PAID' },
                { status: 'PARTIALLY_PAID' }
            ],
            updatedAt: { // Use updatedAt for payment timing proxy, or issuedDate? Ideally Transaction date, but for now updatedAt/createdAt optimization
                gte: start,
                lte: end,
            },
        },
        select: {
            amountPaid: true,
            updatedAt: true, // Using updatedAt as proxy for when it was paid/modified
        },
    });

    const revenueByMonthMap = new Map<string, number>();
    // Initialize all months
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), i, 1);
        revenueByMonthMap.set(format(date, 'MMM'), 0);
    }

    invoicesThisYear.forEach((inv) => {
        const month = format(inv.updatedAt, 'MMM');
        const current = revenueByMonthMap.get(month) || 0;
        revenueByMonthMap.set(month, current + inv.amountPaid);
    });

    const revenueByMonth = Array.from(revenueByMonthMap.entries()).map(([month, amount]) => ({
        month,
        amount,
    }));

    return {
        totalRevenue,
        totalJobs,
        completedJobs,
        scheduledJobs,
        revenueByMonth,
    };
}
