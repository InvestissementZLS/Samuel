'use server';

import { prisma } from '@/lib/prisma';
import { startOfYear, endOfYear, format } from 'date-fns';

export async function getDashboardStats() {
    const now = new Date();
    const start = startOfYear(now);
    const end = endOfYear(now);

    // 1. Total Revenue (Paid Invoices)
    const paidInvoices = await prisma.invoice.findMany({
        where: {
            status: 'PAID',
        },
        select: {
            total: true,
        },
    });
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);

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
            status: 'PAID',
            createdAt: {
                gte: start,
                lte: end,
            },
        },
        select: {
            total: true,
            createdAt: true,
        },
    });

    const revenueByMonthMap = new Map<string, number>();
    // Initialize all months
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), i, 1);
        revenueByMonthMap.set(format(date, 'MMM'), 0);
    }

    invoicesThisYear.forEach((inv) => {
        const month = format(inv.createdAt, 'MMM');
        const current = revenueByMonthMap.get(month) || 0;
        revenueByMonthMap.set(month, current + inv.total);
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
