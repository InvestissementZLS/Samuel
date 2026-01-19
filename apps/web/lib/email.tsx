import { Resend } from 'resend';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/pdf/invoice-pdf';
import { QuotePDF } from '@/components/pdf/quote-pdf';
import { ServiceReportPDF } from '@/components/pdf/service-report-pdf';
import { Invoice, Quote, Client, Product, Job, User, UsedProduct, Division } from '@prisma/client';

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

export async function sendPreparationListEmail(client: Client, division: Division, items: any[]) {
    // items must be list of { listUrl: string, serviceName: string }
    const config = getEmailConfig(division);

    if (!config.resend) return;

    try {
        const isEn = (client as any).language === 'EN';
        const subject = isEn
            ? `Preparation for your upcoming service - ${division === 'EXTERMINATION' ? 'Extermination ZLS' : 'Les Entreprises ZLS'}`
            : `Préparation pour votre service à venir - ${division === 'EXTERMINATION' ? 'Extermination ZLS' : 'Les Entreprises ZLS'}`;

        const listHtml = items.map(item => `
            <div style="margin-bottom: 12px; padding: 12px; border: 1px solid #ddd; rounded: 4px;">
                <strong>${item.serviceName}</strong><br/>
                <a href="${item.listUrl}" style="color: #4F46E5;">${isEn ? 'View Preparation Sheet' : 'Voir la fiche de préparation'}</a>
            </div>
        `).join('');

        const html = isEn
            ? `
                <div style="font-family: sans-serif;">
                    <h2>Hello ${client.name},</h2>
                    <p>Thank you for booking with us. Please review the preparation instructions below for your upcoming service(s).</p>
                    <p>It is important to complete these steps to ensure the effectiveness of the treatment.</p>
                    <br/>
                    ${listHtml}
                    <br/>
                    <p>If you have any questions, please contact us.</p>
                </div>
            ` : `
                <div style="font-family: sans-serif;">
                    <h2>Bonjour ${client.name},</h2>
                    <p>Merci de faire affaire avec nous. Veuillez consulter les instructions de préparation ci-dessous pour votre service.</p>
                    <p>Il est important de suivre ces étapes pour assurer l'efficacité du traitement.</p>
                    <br/>
                    ${listHtml}
                    <br/>
                    <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
                </div>
            `;

        await config.resend.emails.send({
            from: config.from,
            to: [client.email || ''],
            subject: subject,
            html: html,
        });

    } catch (error) {
        console.error("Failed to send PDS email:", error);
    }
}

export async function sendServiceReportEmail(job: Job & { client: Client; property: any; products: (UsedProduct & { product: Product })[]; technicians: User[] }) {
    const config = getEmailConfig(job.division);

    if (!config.resend) return;

    try {
        const pdfBuffer = await renderToBuffer(<ServiceReportPDF job={job} language={(job.client as any).language || 'EN'} />);

        const isEn = (job.client as any).language === 'EN';
        const subject = isEn
            ? `Service Report - ${job.division === 'EXTERMINATION' ? 'Extermination ZLS' : 'Les Entreprises ZLS'}`
            : `Rapport de Service - ${job.division === 'EXTERMINATION' ? 'Extermination ZLS' : 'Les Entreprises ZLS'}`;

        const html = isEn
            ? `
                <div style="font-family: sans-serif;">
                    <h2>Hello ${job.client.name},</h2>
                    <p>Your service has been completed.</p>
                    <p>Please find the attached service report for your records.</p>
                    <br/>
                    <p>Thank you!</p>
                </div>
            ` : `
                <div style="font-family: sans-serif;">
                    <h2>Bonjour ${job.client.name},</h2>
                    <p>Votre service a été complété.</p>
                    <p>Veuillez trouver ci-joint le rapport de service.</p>
                    <br/>
                    <p>Merci !</p>
                </div>
            `;

        await config.resend.emails.send({
            from: config.from,
            to: [job.client.email || ''],
            subject: subject,
            html: html,
            attachments: [
                {
                    filename: isEn ? `ServiceReport-${job.id.slice(0, 8)}.pdf` : `RapportService-${job.id.slice(0, 8)}.pdf`,
                    content: pdfBuffer
                }
            ]
        });

        return { success: true };

    } catch (error) {
        console.error("Failed to send service report email:", error);
        return { success: false, error };
    }
}
