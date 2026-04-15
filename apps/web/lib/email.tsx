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
    if (division === "EXTERMINATION") {
        return {
            resend: resendExtermination || resendEntreprises,
            from: "Extermination ZLS <extermination@lesentrepriseszls.com>",
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
        from: "Les Entreprises ZLS <info@lesentrepriseszls.com>",
        companyName: "Les Entreprises ZLS"
    };
}

export async function getEmailConfig(division: Division | string) {
    // Attempt to fetch custom settings from the database
    let dbSettings = null;
    try {
        dbSettings = await prisma.divisionSettings.findUnique({
            where: { division: division as Division }
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

// ─── Email HTML builder ────────────────────────────────────────────────────
function buildEmailHtml({
    division,
    companyName,
    clientName,
    isEn,
    subject,
    badgeLabel,
    badgeColor,
    number,
    total,
    ctaUrl,
    ctaLabel,
    portalUrl,
    isQuote = false,
}: {
    division: string;
    companyName: string;
    clientName: string;
    isEn: boolean;
    subject: string;
    badgeLabel: string;
    badgeColor: string;
    number: string;
    total: string;
    ctaUrl: string;
    ctaLabel: string;
    portalUrl: string | null;
    isQuote?: boolean;
}) {
    const appUrl = getAppUrl();
    const logoFilename = division === 'RENOVATION' ? 'renovation-logo.png' : 'zls-logo.png';
    const logoUrl = `${appUrl}/${logoFilename}`;

    // Use first name only
    const firstName = clientName.split(' ')[0];

    // Header gradient by division
    const headerGradient = division === 'EXTERMINATION'
        ? 'linear-gradient(135deg,#7f1d1d,#b91c1c)'
        : division === 'RENOVATION'
            ? 'linear-gradient(135deg,#78350f,#d97706)'
            : 'linear-gradient(135deg,#1e3a8a,#1d4ed8)';

    const accentColor = division === 'EXTERMINATION' ? '#b91c1c'
        : division === 'RENOVATION' ? '#d97706'
        : '#1d4ed8';

    // Division-specific contacts
    const companyEmail = division === 'RENOVATION'
        ? 'renovationestheban@gmail.com'
        : 'exterminationzls@gmail.com';

    // Body paragraphs
    const bodyText = isEn ? `
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">
            Please find attached your ${isQuote ? 'quote' : 'invoice'} for services rendered by ${companyName}.
        </p>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">
            Thank you for your trust. It is always a pleasure to provide you with professional and personalized service to ensure your peace of mind.
        </p>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">
            Please do not hesitate to contact us for any questions regarding this ${isQuote ? 'quote' : 'invoice'} or for any additional service requests.
        </p>
        <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
            We look forward to continuing to serve you!
        </p>
    ` : `
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">
            Veuillez trouver ci-joint votre ${isQuote ? 'soumission' : 'facture'} pour les services rendus par ${companyName}.
        </p>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">
            Nous vous remercions pour votre confiance. C'est toujours un plaisir de vous offrir un service professionnel et personnalisé pour assurer votre tranquillité d'esprit.
        </p>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">
            N'hésitez pas à nous contacter pour toute question concernant cette ${isQuote ? 'soumission' : 'facture'} ou pour toute demande de service supplémentaire.
        </p>
        <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
            Au plaisir de continuer à vous servir !
        </p>
    `;

    const totalLabel = isEn ? 'Total Amount' : 'Montant total';
    const portalTitle = isEn ? '🗂️ Your Client Portal' : '🗂️ Votre portail client';
    const portalDesc = isEn
        ? 'View your invoices, quotes and book services anytime.'
        : 'Consultez vos factures, soumissions et réservez des services en tout temps.';
    const portalCta = isEn ? 'Access My Portal →' : 'Accéder à mon portail →';

    // Signature block
    const closingWord = isEn ? 'Sincerely,' : 'Cordialement,';
    const teamLabel = isEn ? `The ${companyName} Team` : `L'équipe ${companyName}`;
    const signatureBlock = `
        <p style="margin:0 0 4px;font-size:15px;color:#374151;">${closingWord}</p>
        <br/>
        <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#111827;">${teamLabel}</p>
        <p style="margin:0 0 2px;font-size:14px;color:#6b7280;">${companyEmail}</p>
        <p style="margin:0 0 2px;font-size:14px;color:#6b7280;">Samuel : 514-963-4010</p>
        <p style="margin:0;font-size:14px;color:#6b7280;">Zachary : 450-602-1224</p>
    `;

    const portalBlock = portalUrl ? `
        <div style="margin-top:24px;padding:20px;background:#f5f3ff;border-radius:10px;border:1px solid #ddd6fe;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#4c1d95;">${portalTitle}</p>
            <p style="margin:0 0 14px;font-size:13px;color:#6b7280;">${portalDesc}</p>
            <a href="${portalUrl}" style="background:#4F46E5;color:#fff;padding:10px 22px;text-decoration:none;border-radius:6px;font-size:13px;font-weight:700;display:inline-block;">${portalCta}</a>
        </div>` : '';

    return `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'fr'}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:${headerGradient};padding:36px 40px;text-align:center;">
            <img src="${logoUrl}" alt="${companyName}" style="height:64px;max-width:180px;object-fit:contain;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;" />
            <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">${companyName}</p>
          </td>
        </tr>

        <!-- BADGE -->
        <tr>
          <td style="background:${badgeColor};padding:10px 40px;text-align:center;">
            <span style="color:#fff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${badgeLabel} — #${number}</span>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;font-size:17px;font-weight:600;color:#111827;">${isEn ? `Hello ${firstName},` : `Bonjour ${firstName},`}</p>

            ${bodyText}

            <!-- Amount card -->
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;margin:24px 0;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;font-weight:600;">${totalLabel}</p>
              <p style="margin:0;font-size:32px;font-weight:800;color:${accentColor};">$${total}</p>
            </div>

            <!-- CTA Button -->
            <div style="text-align:center;margin:28px 0;">
              <a href="${ctaUrl}" style="background:${accentColor};color:#fff;padding:14px 36px;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;display:inline-block;">${ctaLabel}</a>
            </div>

            ${portalBlock}

            <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0;" />
            ${signatureBlock}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#f9fafb;padding:16px 40px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">1267 Rue des Chênes, Prévost, QC J0R 1T0</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}


export async function sendInvoiceEmail(invoice: InvoiceWithDetails) {
    const config = await getEmailConfig(invoice.division);
    if (!config.resend) return { success: false, error: "Missing API Key" };

    try {
        const isEn = (invoice.client as any).language === 'EN';
        const clientData = await prisma.client.findUnique({ where: { id: invoice.client.id }, select: { portalToken: true } });
        const portalToken = clientData?.portalToken;
        const portalUrl = portalToken ? `${getAppUrl()}/portal/${portalToken}` : null;
        const invoiceUrl = `${getAppUrl()}/legacy-portal/invoices/${invoice.id}`;

        const subject = isEn
            ? `Invoice #${invoice.number} from ${config.companyName}`
            : `Facture #${invoice.number} de ${config.companyName}`;

        const html = buildEmailHtml({
            division: invoice.division,
            companyName: config.companyName,
            clientName: invoice.client.name || '',
            isEn,
            subject,
            badgeLabel: isEn ? 'Invoice' : 'Facture',
            badgeColor: '#111827',
            number: invoice.number || invoice.id.slice(0, 8),
            total: Number(invoice.total).toFixed(2),
            ctaUrl: invoiceUrl,
            ctaLabel: isEn ? 'View Invoice' : 'Voir la Facture',
            portalUrl,
        });

        const data = await config.resend.emails.send({ from: config.from, to: [invoice.client.email || ''], subject, html });
        return { success: true, data };
    } catch (error) {
        console.error("Failed to send invoice email:", error);
        return { success: false, error };
    }
}

export async function sendQuoteEmail(quote: QuoteWithDetails) {
    const config = await getEmailConfig(quote.division);
    if (!config.resend) return { success: false, error: "Missing API Key" };

    try {
        const isEn = (quote.client as any).language === 'EN';
        const clientData = await prisma.client.findUnique({ where: { id: quote.client.id }, select: { portalToken: true } });
        const portalToken = clientData?.portalToken;
        const portalUrl = portalToken ? `${getAppUrl()}/portal/${portalToken}` : null;
        const quoteUrl = `${getAppUrl()}/legacy-portal/quotes/${quote.id}`;

        const subject = isEn
            ? `Quote #${quote.number} from ${config.companyName}`
            : `Soumission #${quote.number} de ${config.companyName}`;

        const html = buildEmailHtml({
            division: quote.division,
            companyName: config.companyName,
            clientName: quote.client.name || '',
            isEn,
            subject,
            badgeLabel: isEn ? 'Quote' : 'Soumission',
            badgeColor: '#065f46',
            number: quote.number || quote.id.slice(0, 8),
            total: Number(quote.total).toFixed(2),
            ctaUrl: quoteUrl,
            ctaLabel: isEn ? 'View & Sign Quote' : 'Voir & Signer la Soumission',
            portalUrl,
            isQuote: true,
        });

        const data = await config.resend.emails.send({ from: config.from, to: [quote.client.email || ''], subject, html });
        return { success: true, data };
    } catch (error) {
        console.error("Failed to send quote email:", error);
        return { success: false, error };
    }
}

const systemResend = resendEntreprises || (process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);



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

/**
 * Sends a password reset email to the user.
 */
export async function sendPasswordResetEmail(email: string, token: string, division: string = "EXTERMINATION") {
    try {
        const config = await getEmailConfig(division);
        if (!config.resend) {
            return { success: false, error: "Resend configuration missing" };
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://praxiszls.com';
        const resetLink = `${appUrl}/reset-password?token=${token}`;

        const html = `
            <div style="font-family: sans-serif; max-w-2xl mx-auto; p-4 text-gray-800">
                <h1 style="color: #1e3a8a; font-size: 24px; margin-bottom: 20px;">Réinitialisation de votre mot de passe</h1>
                <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte technicien ZLS.</p>
                <p>Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe (valide pendant 1 heure) :</p>
                
                <div style="margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                        Réinitialiser mon mot de passe
                    </a>
                </div>
                
                <p style="font-size: 14px; color: #666;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
                <p style="font-size: 12px; color: #666; word-break: break-all;">${resetLink}</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eaeaea;" />
                <p style="font-size: 12px; color: #999;">Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer ce courriel.</p>
            </div>
        `;

        const data = await config.resend.emails.send({
            from: config.from,
            to: email,
            subject: 'ZLS - Réinitialisation de votre mot de passe',
            html: html,
        });

        if (data.error) {
            return { success: false, error: data.error.message };
        }
        return { success: true };
    } catch (error: any) {
        console.error("Error sending password reset email:", error);
        return { success: false, error: error.message };
    }
}

// ─── WARRANTY REMINDER EMAIL ────────────────────────────────────────────────
export async function sendWarrantyReminderEmail({
    clientName, clientEmail, clientLanguage, portalToken,
    warrantyExpiresAt, daysLeft, division, companyPhone,
}: {
    clientName: string; clientEmail: string; clientLanguage: string;
    portalToken: string; warrantyExpiresAt: Date; daysLeft: number;
    division: string; companyPhone?: string;
}) {
    const config = await getEmailConfig(division);
    if (!config.resend) return { success: false, error: 'Missing Resend API Key' };

    const appUrl = getAppUrl();
    const portalUrl = `${appUrl}/portal/${portalToken}`;
    const bookingUrl = `${appUrl}/booking/${portalToken}`;
    const isEn = clientLanguage === 'EN';
    const companyName = config.companyName;
    const phone = companyPhone || '514-963-4010';

    const formattedExpiry = new Intl.DateTimeFormat(isEn ? 'en-CA' : 'fr-CA', {
        day: 'numeric', month: 'long', year: 'numeric'
    }).format(warrantyExpiresAt);

    const urgencyColor = daysLeft <= 7 ? '#dc2626' : daysLeft <= 14 ? '#d97706' : '#059669';
    const urgencyLabel = isEn
        ? (daysLeft <= 7 ? 'URGENT' : daysLeft <= 14 ? 'Action Required' : 'Heads Up')
        : (daysLeft <= 7 ? 'URGENT' : daysLeft <= 14 ? 'Action requise' : 'Rappel important');
    const barWidth = Math.min(100, Math.max(5, Math.round(daysLeft / 0.3)));

    const subject = isEn
        ? `⚠️ Your warranty expires in ${daysLeft} days — ${companyName}`
        : `⚠️ Votre garantie expire dans ${daysLeft} jours — ${companyName}`;

    const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
      <div style="background:linear-gradient(135deg,#1e3a8a,#3730a3);padding:32px 40px;">
        <p style="margin:0;color:#93c5fd;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${companyName}</p>
        <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">${isEn ? 'Warranty Expiry Notice' : 'Avis d\'expiration de garantie'}</h1>
      </div>
      <div style="background:${urgencyColor}18;border-left:4px solid ${urgencyColor};padding:10px 24px;">
        <span style="color:${urgencyColor};font-weight:700;font-size:12px;text-transform:uppercase;">${urgencyLabel} — ${daysLeft} ${isEn ? 'days left' : 'jours restants'}</span>
      </div>
      <div style="padding:32px 40px;">
        <p style="color:#374151;font-size:15px;margin-top:0;">${isEn ? 'Hello' : 'Bonjour'} <strong>${clientName}</strong>,</p>
        <p style="color:#4b5563;line-height:1.7;">
          ${isEn
            ? `Your pest control warranty with <strong>${companyName}</strong> expires in <strong style="color:${urgencyColor};">${daysLeft} days</strong> on <strong>${formattedExpiry}</strong>.`
            : `Votre garantie de protection antiparasitaire avec <strong>${companyName}</strong> expire dans <strong style="color:${urgencyColor};">${daysLeft} jours</strong>, le <strong>${formattedExpiry}</strong>.`}
        </p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:24px 0;">
          <p style="margin:0 0 6px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;font-weight:600;">📋 ${isEn ? 'Your coverage' : 'Votre couverture'}</p>
          <p style="margin:0;font-size:14px;color:#111827;font-weight:600;">${isEn ? 'Pest control protection' : 'Protection antiparasitaire'} — ${isEn ? 'expires' : 'expire le'} ${formattedExpiry}</p>
          <div style="margin-top:10px;height:6px;background:#e5e7eb;border-radius:999px;overflow:hidden;">
            <div style="height:100%;width:${barWidth}%;background:${urgencyColor};border-radius:999px;"></div>
          </div>
          <p style="margin:6px 0 0;font-size:11px;color:#9ca3af;">${daysLeft} ${isEn ? 'days remaining' : 'jours restants'}</p>
        </div>
        <p style="color:#4b5563;line-height:1.7;font-size:14px;">
          ${isEn
            ? 'To keep your home protected, we recommend renewing before the expiry date:'
            : 'Pour maintenir la protection de votre domicile, nous vous recommandons de renouveler avant la date d\'expiration :'}
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${bookingUrl}" style="background:#1e3a8a;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;display:inline-block;">
            🔒 ${isEn ? 'Renew My Protection' : 'Renouveler ma protection'}
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px;text-align:center;">
          ${isEn ? 'Or visit your portal:' : 'Ou visitez votre portail :'} <a href="${portalUrl}" style="color:#1e3a8a;font-weight:600;">${isEn ? 'My Portal' : 'Mon portail'}</a>
        </p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0;"/>
        <p style="color:#6b7280;font-size:13px;">
          ${isEn ? 'Questions? Call us at' : 'Questions ? Appelez-nous au'} <strong>${phone}</strong>
        </p>
        <p style="color:#374151;font-size:14px;margin-bottom:0;">
          ${isEn ? 'Thank you,' : 'Merci,'}<br/><strong>${isEn ? `The ${companyName} Team` : `L'équipe ${companyName}`}</strong>
        </p>
      </div>
      <div style="background:#f9fafb;padding:16px 40px;border-top:1px solid #f3f4f6;">
        <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
          ${isEn
            ? `You're receiving this because you have an active warranty with ${companyName}. Do not reply to this email.`
            : `Vous recevez ce courriel car vous bénéficiez d'une garantie active avec ${companyName}. Ne pas répondre à ce courriel.`}
        </p>
      </div>
    </div>`;

    try {
        const data = await config.resend.emails.send({ from: config.from, to: [clientEmail], subject, html });
        return { success: true, data };
    } catch (error) {
        console.error('Failed to send warranty reminder email:', error);
        return { success: false, error };
    }
}
