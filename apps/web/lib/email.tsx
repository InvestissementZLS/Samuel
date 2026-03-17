import { Resend } from 'resend';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/pdf/invoice-pdf';
import { QuotePDF } from '@/components/pdf/quote-pdf';
import { ServiceReportPDF } from '@/components/pdf/service-report-pdf';
import { Invoice, Quote, Client, Product, Job, User, UsedProduct, Division } from '@prisma/client';

import { prisma } from './prisma';

// Initialize Resend Clients
const resendEntreprises = process.env.RESEND_API_KEY_ENTREPRISES
    ? new Resend(process.env.RESEND_API_KEY_ENTREPRISES)
    : (process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);

const resendExtermination = process.env.RESEND_API_KEY_EXTERMINATION
    ? new Resend(process.env.RESEND_API_KEY_EXTERMINATION)
    : null;

// Fallback logic to get default config if DB settings are missing
function getDefaultEmailConfig(division: string) {
    if (division === "EXTERMINATION" && resendExtermination) {
        return {
            resend: resendExtermination,
            from: "Extermination ZLS <extermination@praxiszls.com>",
            companyName: "Extermination ZLS"
        };
    }

    if (division === "RENOVATION") {
        return {
            resend: resendEntreprises,
            from: "Rénovation Esthéban <renovationestheban@praxiszls.com>",
            companyName: "Rénovation Esthéban"
        };
    }

    return {
        resend: resendEntreprises,
        from: "Les Entreprises ZLS <Lesentrepriseszls@praxiszls.com>",
        companyName: "Les Entreprises ZLS"
    };
}

export async function getEmailConfig(division: Division) {
    // Attempt to fetch custom settings from the database
    let dbSettings = null;
    try {
        dbSettings = await prisma.divisionSettings.findUnique({
            where: { division }
        });
    } catch (e) {
        console.warn("Could not fetch division settings from DB, falling back to defaults.", e);
    }

    const defaultConfig = getDefaultEmailConfig(division);

    if (dbSettings) {
        // If they provided a custom API key, instantiate a new Resend client
        const customResend = dbSettings.resendApiKey 
            ? new Resend(dbSettings.resendApiKey) 
            : defaultConfig.resend;

        return {
            resend: customResend,
            from: `${dbSettings.emailSenderName} <${dbSettings.emailSenderAddress}>`,
            companyName: dbSettings.emailSenderName,
        };
    }

    return defaultConfig;
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
    const config = await getEmailConfig(invoice.division);

    if (!config.resend) {
        console.log("Resend API Key missing for division: " + invoice.division);
        return { success: false, error: "Missing API Key" };
    }

    try {
        const companyName = config.companyName;

        const subject = (invoice.client as any).language === 'EN'
            ? `Invoice #${invoice.number} from ${companyName}`
            : `Facture #${invoice.number} de ${companyName}`;

        const portalUrl = `${getAppUrl()}/legacy-portal/invoices/${invoice.id}`;

        const html = (invoice.client as any).language === 'EN'
            ? `
                <div style="font-family: sans-serif;">
                    <h2>Hello ${invoice.client.name},</h2>
                    <p>You have received a new invoice from ${companyName}.</p>
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
                    <p>Vous avez reçu une nouvelle facture de ${companyName}.</p>
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
    const config = await getEmailConfig(quote.division);

    if (!config.resend) {
        console.log("Resend API Key missing for division: " + quote.division);
        return { success: false, error: "Missing API Key" };
    }

    try {
        const companyName = config.companyName;

        const subject = (quote.client as any).language === 'EN'
            ? `Quote #${quote.number} from ${companyName}`
            : `Soumission #${quote.number} de ${companyName}`;

        const portalUrl = `${getAppUrl()}/legacy-portal/quotes/${quote.id}`;

        const html = (quote.client as any).language === 'EN'
            ? `
                <div style="font-family: sans-serif;">
                    <h2>Hello ${quote.client.name},</h2>
                    <p>You have received a new quote from ${companyName}.</p>
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
                    <p>Vous avez reçu une nouvelle soumission de ${companyName}.</p>
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
    const config = await getEmailConfig(division);

    if (!config.resend) return;

    try {
        const isEn = (client as any).language === 'EN';
        const subject = isEn
            ? `Preparation for your upcoming service - ${config.companyName}`
            : `Préparation pour votre service à venir - ${config.companyName}`;

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
    const config = await getEmailConfig(job.division);

    if (!config.resend) return;

    try {
        const logoFilename = job.division === "RENOVATION" ? "renovation-logo.png" : "zls-logo.png";
        // Use process.cwd() to get the project root in Next.js server actions / API routes
        const logoPath = process.cwd() + '/public/' + logoFilename;

        let logoData = null;
        try {
            const fs = require('fs');
            if (fs.existsSync(logoPath)) {
                logoData = fs.readFileSync(logoPath);
            } else {
                console.warn(`Logo not found at path: ${logoPath}`);
            }
        } catch (e) {
            console.error("Error reading logo file:", e);
        }

        const logoDataUrl = logoData ? `data:image/png;base64,${logoData.toString('base64')}` : undefined;

        const pdfBuffer = await renderToBuffer(<ServiceReportPDF job={{ ...job, logoPath: logoDataUrl }} language={(job.client as any).language || 'EN'} />);

        const isEn = (job.client as any).language === 'EN';
        const subject = isEn
            ? `Service Report - ${config.companyName}`
            : `Rapport de Service - ${config.companyName}`;

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

export async function sendPortalAccessEmail(client: Client, token: string) {
    // @ts-ignore
    const division = client.divisions && client.divisions.length > 0 
        // @ts-ignore
        ? client.divisions[0] 
        : "EXTERMINATION";

    const config = await getEmailConfig(division);
    if (!config.resend) return { success: false, error: "Missing API Key" };

    const companyName = config.companyName;

    // @ts-ignore
    const isEn = client.language === 'EN';
    const subject = isEn 
        ? `Your Client Portal Access - ${companyName}`
        : `Votre accès au portail client - ${companyName}`;

    const portalUrl = `${getAppUrl()}/portal/${token}`;

    const html = isEn
        ? `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Hello ${client.name},</h2>
                <p>Welcome to ${companyName}. You can access your client portal to manage your bookings, quotes, and invoices using the link below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${portalUrl}" style="background-color: #4F46E5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        Access My Portal
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">Or copy this link into your browser: <br/><a href="${portalUrl}" style="color: #4F46E5;">${portalUrl}</a></p>
                <br/>
                <p>Thank you,<br/>The ${companyName} Team</p>
            </div>
        `
        : `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Bonjour ${client.name},</h2>
                <p>Bienvenue chez ${companyName}. Vous pouvez accéder à votre portail client pour gérer vos réservations, soumissions et factures via le lien ci-dessous :</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${portalUrl}" style="background-color: #4F46E5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        Accéder à mon portail
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">Ou copiez ce lien dans votre navigateur : <br/><a href="${portalUrl}" style="color: #4F46E5;">${portalUrl}</a></p>
                <br/>
                <p>Merci,<br/>L'équipe ${companyName}</p>
            </div>
        `;

    try {
        const data = await config.resend.emails.send({
            from: config.from,
            to: [client.email || ''],
            subject: subject,
            html: html,
        });
        return { success: true, data };
    } catch (error) {
        console.error("Failed to send portal access email:", error);
        return { success: false, error };
    }
}

export async function sendBookingConfirmation(
    to: string,
    clientName: string,
    scheduledAt: Date,
    description: string,
    division: Division = "EXTERMINATION",
    language: string = "FR"
) {
    const config = await getEmailConfig(division);
    if (!config.resend) return { success: false, error: "Missing API Key" };

    const companyName = config.companyName;

    const isEn = language === 'EN';

    const formattedDate = new Intl.DateTimeFormat(isEn ? 'en-CA' : 'fr-CA', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'America/New_York'
    }).format(scheduledAt);

    const subject = isEn 
        ? `Booking Confirmation - ${companyName}`
        : `Confirmation de réservation - ${companyName}`;

    const html = isEn ? `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Appointment Confirmation</h1>
            <p>Hello ${clientName},</p>
            <p>We are writing to confirm your appointment for the following service:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Date & Time:</strong> ${formattedDate}</p>
                <p><strong>Description:</strong> ${description}</p>
            </div>
            <p>Our technician will arrive at the scheduled time.</p>
            <p>If you have any questions, please do not hesitate to contact us.</p>
            <br/>
            <p>Thank you,<br/>The ${companyName} Team</p>
        </div>
    ` : `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Confirmation de votre rendez-vous</h1>
            <p>Bonjour ${clientName},</p>
            <p>Nous confirmons votre rendez-vous pour le service suivant :</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Date et heure :</strong> ${formattedDate}</p>
                <p><strong>Description :</strong> ${description}</p>
            </div>
            <p>Notre technicien se présentera à l'heure convenue.</p>
            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
            <br/>
            <p>Merci,<br/>L'équipe ${companyName}</p>
        </div>
    `;

    try {
        const data = await config.resend.emails.send({
            from: config.from,
            to: [to],
            subject: subject,
            html: html,
        });
        return { success: true, data };
    } catch (error) {
        console.error("Failed to send booking confirmation email:", error);
        return { success: false, error };
    }
}

export async function sendGenericEmail(to: string, subject: string, html: string, division: Division = "EXTERMINATION") {
    const config = await getEmailConfig(division);
    if (!config.resend) return { success: false, error: "Missing API Key" };

    try {
        const data = await config.resend.emails.send({
            from: config.from,
            to: [to],
            subject: subject,
            html: html,
        });
        return { success: true, data };
    } catch (error) {
        console.error("Failed to send generic email:", error);
        return { success: false, error };
    }
}

