import { Resend } from 'resend';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/pdf/invoice-pdf';
import { QuotePDF } from '@/components/pdf/quote-pdf';
import { Invoice, Quote, Client, Product } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY);

type InvoiceWithDetails = Invoice & {
    client: Client;
    items: (any & { product: Product })[];
};

type QuoteWithDetails = Quote & {
    client: Client;
    items: (any & { product: Product })[];
};

export async function sendInvoiceEmail(invoice: InvoiceWithDetails) {
    if (!process.env.RESEND_API_KEY) {
        console.log("RESEND_API_KEY is missing. Skipping email send.");
        return { success: false, error: "Missing API Key" };
    }

    try {
        const pdfBuffer = await renderToBuffer(<InvoicePDF invoice={invoice} language={(invoice.client as any).language || "FR"} />);

        const subject = (invoice.client as any).language === 'EN'
            ? `Invoice #${invoice.number} from Les Entreprises ZLS`
            : `Facture #${invoice.number} de Les Entreprises ZLS`;

        const html = (invoice.client as any).language === 'EN'
            ? `<p>Hello ${invoice.client.name},</p><p>Please find attached your invoice #${invoice.number}.</p><p>Thank you!</p>`
            : `<p>Bonjour ${invoice.client.name},</p><p>Veuillez trouver ci-joint votre facture #${invoice.number}.</p><p>Merci !</p>`;

        const data = await resend.emails.send({
            from: 'Les Entreprises ZLS <billing@zls.com>',
            to: [invoice.client.email || ''],
            subject: subject,
            html: html,
            attachments: [
                {
                    filename: `Invoice-${invoice.number}.pdf`,
                    content: pdfBuffer,
                },
            ],
        });

        return { success: true, data };
    } catch (error) {
        console.error("Failed to send invoice email:", error);
        return { success: false, error };
    }
}

export async function sendQuoteEmail(quote: QuoteWithDetails) {
    if (!process.env.RESEND_API_KEY) {
        console.log("RESEND_API_KEY is missing. Skipping email send.");
        return { success: false, error: "Missing API Key" };
    }

    try {
        const pdfBuffer = await renderToBuffer(<QuotePDF quote={quote} language={(quote.client as any).language || "FR"} />);

        const subject = (quote.client as any).language === 'EN'
            ? `Quote #${quote.number} from Les Entreprises ZLS`
            : `Soumission #${quote.number} de Les Entreprises ZLS`;

        const html = (quote.client as any).language === 'EN'
            ? `<p>Hello ${quote.client.name},</p><p>Please find attached your quote #${quote.number}.</p><p>Thank you!</p>`
            : `<p>Bonjour ${quote.client.name},</p><p>Veuillez trouver ci-joint votre soumission #${quote.number}.</p><p>Merci !</p>`;

        const data = await resend.emails.send({
            from: 'Les Entreprises ZLS <sales@zls.com>',
            to: [quote.client.email || ''],
            subject: subject,
            html: html,
            attachments: [
                {
                    filename: `Quote-${quote.number}.pdf`,
                    content: pdfBuffer,
                },
            ],
        });

        return { success: true, data };
    } catch (error) {
        console.error("Failed to send quote email:", error);
        return { success: false, error };
    }
}

export async function sendPasswordResetEmail(email: string, token: string) {
    if (!process.env.RESEND_API_KEY) {
        console.log(`[EMAIL MOCK] Password reset link for ${email}: ${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`);
        return;
    }

    try {
        await resend.emails.send({
            from: 'Antigravity <onboarding@resend.dev>', // Update this with your verified domain
            to: email,
            subject: 'Reset your password',
            html: `
                <p>You requested a password reset.</p>
                <p>Click the link below to reset your password:</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
            `,
        });
    } catch (error) {
        console.error('Failed to send email:', error);
        // Fallback to logging for development if email fails
        console.log(`[EMAIL FALLBACK] Password reset link for ${email}: ${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`);
    }
}
