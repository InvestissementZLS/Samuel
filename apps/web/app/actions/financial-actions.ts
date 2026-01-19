'use server';

import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface FinancialStats {
    revenue: number;
    cogs: {
        material: number;
        labor: number;
        total: number;
    };
    grossProfit: number;
    grossMargin: number;
    expenses: {
        total: number;
        byCategory: { category: string; amount: number }[];
    };
    netProfit: number;
    netMargin: number;
}

export async function getFinancialStats(startDate: Date, endDate: Date): Promise<FinancialStats> {

    // 1. Fetch Completed Jobs in Range
    const jobs = await prisma.job.findMany({
        where: {
            completedAt: {
                gte: startDate,
                lte: endDate
            },
            status: 'COMPLETED' // Ensure we only count completed work
        },
        include: {
            invoices: true
        }
    });

    // 2. Fetch Business Expenses in Range
    const expenses = await prisma.expense.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    });

    // --- Calculation ---

    // Revenue: Sum of Net Selling Price from Jobs
    // OR Sum of Invoices generated in this period? 
    // Usually Revenue is recognized when Job is Done (Accrual basis) or Invoice Paid (Cash basis).
    // Let's stick to Job Completion for operational profitability.
    // We use the `netSellingPrice` field we updated in `job-costing`. 
    // If that field is null, we fallback to invoice calc.
    let revenue = 0;
    let materialCost = 0;
    let laborCost = 0;

    for (const job of jobs) {
        // Use pre-calculated values if available, otherwise 0
        revenue += job.netSellingPrice || 0;

        // If netSellingPrice is 0 (maybe cost calc wasn't run), try to find invoice
        if ((job.netSellingPrice === 0 || job.netSellingPrice === null) && job.invoices.length > 0) {
            const inv = job.invoices.find(i => i.status !== 'CANCELLED');
            if (inv) {
                revenue += (inv.total - (inv.tax || 0));
            }
        }

        materialCost += job.totalMaterialCost || 0;
        laborCost += job.totalLaborCost || 0;
    }

    const cogsTotal = materialCost + laborCost;
    const grossProfit = revenue - cogsTotal;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    // Expenses
    const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Group Expenses by Category
    const expensesByCategoryMap = expenses.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
    }, {} as Record<string, number>);

    const expensesByCategory = Object.entries(expensesByCategoryMap).map(([category, amount]) => ({
        category,
        amount
    }));

    // Net Profit
    const netProfit = grossProfit - expenseTotal;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
        revenue,
        cogs: {
            material: materialCost,
            labor: laborCost,
            total: cogsTotal
        },
        grossProfit,
        grossMargin,
        expenses: {
            total: expenseTotal,
            byCategory: expensesByCategory
        },
        netProfit,
        netMargin
    };
}

export async function getFinancialHistory() {
    // Get last 6 months metrics for charts
    const history = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
        const start = startOfMonth(subMonths(today, i));
        const end = endOfMonth(subMonths(today, i));
        const stats = await getFinancialStats(start, end);

        history.push({
            month: format(start, 'MMM yyyy'),
            revenue: stats.revenue,
            netProfit: stats.netProfit,
            expenses: stats.expenses.total
        });
    }

    return history;
}
