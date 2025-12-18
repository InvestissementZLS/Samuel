import { Resend } from 'resend';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/pdf/invoice-pdf';
import { QuotePDF } from '@/components/pdf/quote-pdf';
import { Invoice, Quote, Client, Product } from '@prisma/client';

// Initialize Resend only if API key is present
const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : { emails: { send: async () => ({ id: 'mock_id' }) } } as unknown as Resend;


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
        const subject = (invoice.client as any).language === 'EN'
            ? `Invoice #${invoice.number} from Les Entreprises ZLS`
            : `Facture #${invoice.number} de Les Entreprises ZLS`;

        const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/invoices/${invoice.id}`;

        const html = (invoice.client as any).language === 'EN'
            ? `
                <div style="font-family: sans-serif;">
                    <h2>Hello ${invoice.client.name},</h2>
                    <p>You have received a new invoice from Les Entreprises ZLS.</p>
                    <p><strong>Invoice #${invoice.number || invoice.id.slice(0, 8)}</strong></p>
                    <p>Total: $${invoice.total.toFixed(2)}</p>
                    <br/>
                    <a href="${portalUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                        View Invoice
                    </a>
                    <br/><br/>
                    <p>Or copy this link: <a href="${portalUrl}">${portalUrl}</a></p>
                    <br/>
                    <p>Thank you!</p>
                </div>
            `
            : `
                <div style="font-family: sans-serif;">
                    <h2>Bonjour ${invoice.client.name},</h2>
                    <p>Vous avez reçu une nouvelle facture de Les Entreprises ZLS.</p>
                    <p><strong>Facture #${invoice.number || invoice.id.slice(0, 8)}</strong></p>
                    <p>Total: $${invoice.total.toFixed(2)}</p>
                    <br/>
                    <a href="${portalUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                        Voir la Facture
                    </a>
                    <br/><br/>
                    <p>Ou copiez ce lien: <a href="${portalUrl}">${portalUrl}</a></p>
                    <br/>
                    <p>Merci !</p>
                </div>
            `;

        const data = await resend.emails.send({
            from: 'Les Entreprises ZLS <billing@zls.com>',
            to: [invoice.client.email || ''],
            subject: subject,
            html: html,
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
        const subject = (quote.client as any).language === 'EN'
            ? `Quote #${quote.number} from Les Entreprises ZLS`
            : `Soumission #${quote.number} de Les Entreprises ZLS`;

        const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/quotes/${quote.id}`;

        const html = (quote.client as any).language === 'EN'
            ? `
                <div style="font-family: sans-serif;">
                    <h2>Hello ${quote.client.name},</h2>
                    <p>You have received a new quote from Les Entreprises ZLS.</p>
                    <p><strong>Quote #${quote.number || quote.id.slice(0, 8)}</strong></p>
                    <p>Total: $${quote.total.toFixed(2)}</p>
                    <br/>
                    <a href="${portalUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                        View & Sign Quote
                    </a>
                    <br/><br/>
                    <p>Or copy this link: <a href="${portalUrl}">${portalUrl}</a></p>
                    <br/>
                    <p>Thank you!</p>
                </div>
            `
            : `
                <div style="font-family: sans-serif;">
                    <h2>Bonjour ${quote.client.name},</h2>
                    <p>Vous avez reçu une nouvelle soumission de Les Entreprises ZLS.</p>
                    <p><strong>Soumission #${quote.number || quote.id.slice(0, 8)}</strong></p>
                    <p>Total: $${quote.total.toFixed(2)}</p>
                    <br/>
                    <a href="${portalUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                        Voir & Signer la Soumission
                    </a>
                    <br/><br/>
                    <p>Ou copiez ce lien: <a href="${portalUrl}">${portalUrl}</a></p>
                    <br/>
                    <p>Merci !</p>
                </div>
            `;

        const data = await resend.emails.send({
            from: 'Les Entreprises ZLS <sales@zls.com>',
            to: [quote.client.email || ''],
            subject: subject,
            html: html,
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
