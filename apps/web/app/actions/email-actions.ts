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

export async function sendTestEmail(division: string, toEmail: string) {
    try {
        const { Resend } = await import('resend');
        const dbSettings = await prisma.divisionSettings.findUnique({
            where: { division: division as any }
        });

        if (!dbSettings || !dbSettings.resendApiKey) {
            return { success: false, error: "Clé API Resend manquante pour cette division. Sauvegardez-la d'abord." };
        }

        const fromName = dbSettings.emailSenderName || division;
        const fromEmail = dbSettings.emailSenderAddress || 'noreply@praxiszls.com';

        const resend = new Resend(dbSettings.resendApiKey);
        const data = await resend.emails.send({
            from: `${fromName} <${fromEmail}>`,
            to: toEmail,
            subject: 'Test de Configuration Courriel - ZLS',
            html: `<h1>Configuration Réussie !</h1><p>Ceci est un test pour la division ${division}. Votre configuration Resend fonctionne parfaitement.</p>`
        });

        if (data.error) {
            return { success: false, error: data.error.message };
        }
        return { success: true };
    } catch (e: any) {
        console.error("Error sending test email:", e);
        return { success: false, error: e.message };
    }
}
