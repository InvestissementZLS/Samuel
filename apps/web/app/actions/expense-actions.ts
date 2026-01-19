'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Division } from '@prisma/client';

export async function createExpense(data: FormData) {
    try {
        const description = data.get('description') as string;
        const amount = parseFloat(data.get('amount') as string);
        const category = data.get('category') as string; // Will store "Code - Name" or just Code
        const accountingCode = data.get('accountingCode') as string;
        const date = new Date(data.get('date') as string);
        const paymentMethod = data.get('paymentMethod') as string;
        const frequency = data.get('frequency') as any || 'ONCE';

        const expense = await prisma.expense.create({
            data: {
                description,
                amount,
                category,
                accountingCode,
                date,
                paymentMethod,
                frequency,
                // If recurring, we could calculate nextOccurrence here
                nextOccurrence: frequency !== 'ONCE' ? new Date(date) : null // Placeholder logic
            }
        });
        revalidatePath('/expenses');
        return { success: true, expense };
    } catch (error) {
        console.error("Error creating expense:", error);
        return { success: false, error: "Failed to create expense" };
    }
}

export async function deleteExpense(id: string) {
    try {
        await prisma.expense.delete({
            where: { id }
        });
        revalidatePath('/expenses');
        return { success: true };
    } catch (error) {
        console.error("Error deleting expense:", error);
        return { success: false, error: "Failed to delete expense" };
    }
}

export async function getExpenses(month?: number, year?: number) {
    const now = new Date();
    const currentMonth = month !== undefined ? month : now.getMonth();
    const currentYear = year !== undefined ? year : now.getFullYear();

    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0); // Last day of month

    const expenses = await prisma.expense.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        orderBy: {
            date: 'desc'
        }
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    return { expenses, total };
}

export async function getExpenseCategories() {
    // Return common categories or fetch distinct used ones
    // For now, hardcoded standard list + any used ones could be good but let's stick to standard suggestions
    return [
        "Loyer / Rent",
        "Assurances / Insurance",
        "Essence / Gas",
        "Marketing",
        "Matériel de Bureau / Office",
        "Logiciels / Software",
        "Salaire / Payroll",
        "Autre / Other"
    ];
}
