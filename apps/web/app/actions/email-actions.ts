'use server';

import { sendInvoiceEmail, sendQuoteEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

export async function sendInvoice(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            client: true,
            items: {
                include: { product: true }
            }
        }
    });

    if (!invoice) {
        return { success: false, error: "Invoice not found" };
    }

    if (!invoice.client.email) {
        return { success: false, error: "Client has no email address" };
    }

    console.log(`[Action] Sending invoice ${invoice.number} to ${invoice.client.email}`);
    const result = await sendInvoiceEmail(invoice);
    console.log(`[Action] Result:`, result);
    return result;
}

export async function sendQuote(quoteId: string) {
    const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: {
            client: true,
            items: {
                include: { product: true }
            }
        }
    });

    if (!quote) {
        return { success: false, error: "Quote not found" };
    }

    if (!quote.client.email) {
        return { success: false, error: "Client has no email address" };
    }

    console.log(`[Action] Sending quote ${quote.number} to ${quote.client.email}`);
    const result = await sendQuoteEmail(quote);
    console.log(`[Action] Result:`, result);
    return result;
}
