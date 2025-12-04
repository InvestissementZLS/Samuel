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

    return await sendInvoiceEmail(invoice);
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

    return await sendQuoteEmail(quote);
}
