'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PaymentMethod, TransactionType } from '@prisma/client';

export async function recordTransaction(data: {
    invoiceId: string;
    amount: number;
    method: PaymentMethod;
    type: TransactionType;
    note?: string;
    date: Date;
}) {
    const { invoiceId, amount, method, type, note, date } = data;

    // 1. Get current invoice
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { transactions: true }
    });

    if (!invoice) throw new Error("Invoice not found");

    // 2. Create Transaction
    await prisma.transaction.create({
        data: {
            invoiceId,
            amount,
            method,
            type,
            note,
            date
        }
    });

    // 3. Calculate new Amount Paid
    let newAmountPaid = invoice.amountPaid;
    if (type === 'PAYMENT') {
        newAmountPaid += amount;
    } else {
        newAmountPaid -= amount;
    }

    // Ensure amountPaid doesn't go below 0
    if (newAmountPaid < 0) newAmountPaid = 0;

    // 4. Determine new Status
    let newStatus = invoice.status;
    const total = invoice.total;

    if (newAmountPaid >= total) {
        newStatus = 'PAID';
    } else if (newAmountPaid > 0) {
        newStatus = 'PARTIALLY_PAID';
    } else {
        // Revert to SENT if it was paid but now is 0 (refunded full)
        // If it was OVERDUE, logic might need to check date, but SENT is safe default for open invoice
        if (newStatus === 'PAID' || newStatus === 'PARTIALLY_PAID') {
            newStatus = 'SENT';
        }
    }

    // 5. Update Invoice
    await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
            amountPaid: newAmountPaid,
            status: newStatus
        }
    });

    revalidatePath(`/invoices`);
    revalidatePath(`/clients/${invoice.clientId}`);
}
