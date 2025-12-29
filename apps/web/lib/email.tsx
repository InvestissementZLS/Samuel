import { Resend } from 'resend';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/pdf/invoice-pdf';
import { QuotePDF } from '@/components/pdf/quote-pdf';
import { Invoice, Quote, Client, Product } from '@prisma/client';

// Initialize Resend Clients
const resendEntreprises = process.env.RESEND_API_KEY_ENTREPRISES
    ? new Resend(process.env.RESEND_API_KEY_ENTREPRISES)
    : (process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);

const resendExtermination = process.env.RESEND_API_KEY_EXTERMINATION
    ? new Resend(process.env.RESEND_API_KEY_EXTERMINATION)
    : null;

function getEmailConfig(division: "EXTERMINATION" | "ENTREPRISES") {
    if (division === "EXTERMINATION" && resendExtermination) {
        return {
            resend: resendExtermination,
            from: "Extermination ZLS <extermination@praxiszls.com>"
        };
    }
    // Default to Entreprises
    return {
        resend: resendEntreprises,
        from: "Les Entreprises ZLS <extermination@praxiszls.com>"
    };
}


type InvoiceWithDetails = Invoice & {
    client: Client;
    items: (any & { product: Product })[];
};

type QuoteWithDetails = Quote & {
    client: Client;
    items: (any & { product: Product })[];
};

const getAppUrl = () => {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
    // Fallback to production domain if running in production but env var not set
    if (process.env.NODE_ENV === 'production') return 'https://praxiszls.com';
    return 'http://localhost:3000';
};

export async function sendInvoiceEmail(invoice: InvoiceWithDetails) {
    const config = getEmailConfig(invoice.division);

    if (!config.resend) {
        console.log("Resend API Key missing for division: " + invoice.division);
        return { success: false, error: "Missing API Key" };
    }

    try {
        const subject = (invoice.client as any).language === 'EN'
            ? `Invoice #${invoice.number} from ${invoice.division === 'EXTERMINATION' ? 'Extermination ZLS' : 'Les Entreprises ZLS'}`
            : `Facture #${invoice.number} de ${invoice.division === 'EXTERMINATION' ? 'Extermination ZLS' : 'Les Entreprises ZLS'}`;

        const portalUrl = `${getAppUrl()}/portal/invoices/${invoice.id}`;

        const html = (invoice.client as any).language === 'EN'
            ? `
                <div style="font-family: sans-serif;">
                    <h2>Hello ${invoice.client.name},</h2>
                    <p>You have received a new invoice from ${invoice.division === 'EXTERMINATION' ? 'Extermination ZLS' : 'Les Entreprises ZLS'}.</p>
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
                    <p>Vous avez reçu une nouvelle facture de ${invoice.division === 'EXTERMINATION' ? 'Extermination ZLS' : 'Les Entreprises ZLS'}.</p>
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

        console.log(`Sending invoice email to: ${invoice.client.email} from: ${config.from}`);
        const data = await config.resend.emails.send({
            from: config.from,
            to: [invoice.client.email || ''],
            subject: subject,
            html: html,
        });
        console.log("Invoice email sent result:", JSON.stringify(data));

        return { success: true, data };
    } catch (error) {
        console.error("Failed to send invoice email:", error);
        return { success: false, error };
    }
}

export async function sendQuoteEmail(quote: QuoteWithDetails) {
    const config = getEmailConfig(quote.division);

    if (!config.resend) {
        console.log("Resend API Key missing for division: " + quote.division);
        return { success: false, error: "Missing API Key" };
    }

    try {
        const subject = (quote.client as any).language === 'EN'
            ? `Quote #${quote.number} from ${quote.division === 'EXTERMINATION' ? 'Extermination ZLS' : 'Les Entreprises ZLS'}`
            : `Soumission #${quote.number} de ${quote.division === 'EXTERMINATION' ? 'Extermination ZLS' : 'Les Entreprises ZLS'}`;

        const portalUrl = `${getAppUrl()}/portal/quotes/${quote.id}`;

        const html = (quote.client as any).language === 'EN'
            ? `
                <div style="font-family: sans-serif;">
                    <h2>Hello ${quote.client.name},</h2>
                    <p>You have received a new quote from ${quote.division === 'EXTERMINATION' ? 'Extermination ZLS' : 'Les Entreprises ZLS'}.</p>
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
                    <p>Vous avez reçu une nouvelle soumission de ${quote.division === 'EXTERMINATION' ? 'Extermination ZLS' : 'Les Entreprises ZLS'}.</p>
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

        console.log(`Sending email to: ${quote.client.email} from: ${config.from}`);
        const data = await config.resend.emails.send({
            from: config.from,
            to: [quote.client.email || ''],
            subject: subject,
            html: html,
        });
        console.log("Email sent result:", JSON.stringify(data));

        return { success: true, data };
    } catch (error) {
        console.error("Failed to send quote email:", error);
        return { success: false, error };
    }
}

const systemResend = resendEntreprises || (process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);

export async function sendPasswordResetEmail(email: string, token: string) {
    if (!systemResend) {
        console.log(`[EMAIL MOCK] Password reset link for ${email}: ${getAppUrl()}/reset-password?token=${token}`);
        return;
    }

    try {
        await systemResend.emails.send({
            from: 'Extermination ZLS <extermination@praxiszls.com>',
            to: email,
            subject: 'Réinitialisation de mot de passe / Password Reset',
            html: `
                <div style="font-family: sans-serif;">
                    <h2>Réinitialisation de mot de passe</h2>
                    <p>Vous avez demandé une réinitialisation de mot de passe.</p>
                    <p>Cliquez sur le lien ci-dessous pour changer votre mot de passe:</p>
                    <a href="${getAppUrl()}/reset-password?token=${token}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                        Réinitialiser le mot de passe
                    </a>
                    <p>Ce lien est valide pour 1 heure.</p>
                    <hr/>
                    <h2>Password Reset</h2>
                    <p>You requested a password reset.</p>
                    <p>Click the link below to reset your password:</p>
                    <a href="${getAppUrl()}/reset-password?token=${token}">Reset Password</a>
                    <p>This link will expire in 1 hour.</p>
                </div>
            `,
        });
    } catch (error) {
        console.error('Failed to send email:', error);
        // Fallback to logging for development if email fails
        console.log(`[EMAIL FALLBACK] Password reset link for ${email}: ${getAppUrl()}/reset-password?token=${token}`);
    }
}
