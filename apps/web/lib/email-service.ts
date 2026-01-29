import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is missing. logging email to console.");
        console.log(`To: ${to}, Subject: ${subject}`);
        return;
    }

    try {
        const data = await resend.emails.send({
            from: 'PraxisZLS <extermination@praxiszls.com>',
            to,
            subject,
            html,
        });
        console.log("Email sent successfully:", data);
        return data;
    } catch (error) {
        console.error("Failed to send email:", error);
        // Don't throw, just log so we don't break the booking flow if email fails
        return null;
    }
}

export async function sendBookingConfirmation(
    to: string,
    clientName: string,
    scheduledAt: Date,
    description: string
) {
    const formattedDate = new Intl.DateTimeFormat('fr-CA', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'America/New_York' // Adjust as needed
    }).format(scheduledAt);

    const subject = `Confirmation de réservation - PraxisZLS`;

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Confirmation de votre rendez-vous</h1>
            <p>Bonjour ${clientName},</p>
            <p>Nous confirmons votre rendez-vous pour le service suivant :</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Date et heure :</strong> ${formattedDate}</p>
                <p><strong>Description :</strong> ${description}</p>
            </div>
            <p>Un de nos techniciens se présentera à l'heure convenue.</p>
            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
            <br/>
            <p>Merci,<br/>L'équipe PraxisZLS</p>
        </div>
    `;

    return await sendEmail(to, subject, html);
}
