'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { addMinutes, format } from 'date-fns';
import { fr, enCA } from 'date-fns/locale';
import { getEmailConfig } from '@/lib/email';
import { getUserProfile } from './user-actions';

const getAppUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'https://praxiszls.com';

// ─── Email: Admin notified of new booking request ─────────────────────────────
async function sendNewRequestNotification(request: any, client: any, property: any, division: string) {
    const config = await getEmailConfig(division);
    if (!config.resend) return;

    const preferredDaysFormatted = (request.preferredDays as string[])
        .map(d => {
            const date = new Date(d + 'T00:00:00');
            return date.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
        })
        .join(', ');

    const dashboardUrl = `${getAppUrl()}/booking-requests`;

    // Determine admin notification email — use from address of division sender
    const adminEmail = config.from.match(/<(.+)>/)?.[1] || config.from;

    try {
        await config.resend.emails.send({
            from: config.from,
            to: adminEmail,
            subject: `📬 Nouvelle demande de RDV — ${client.name}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
                    <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 20px;">📬 Nouvelle demande de rendez-vous</h1>
                        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">${config.companyName}</p>
                    </div>
                    <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 140px;">👤 Client</td>
                                <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${client.name}${client.companyName ? ` (${client.companyName})` : ''}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">📍 Adresse</td>
                                <td style="padding: 8px 0; font-size: 14px;">${property?.address || 'Non spécifiée'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">📞 Téléphone</td>
                                <td style="padding: 8px 0; font-size: 14px;">${client.phone || '—'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">📅 Jours préférés</td>
                                <td style="padding: 8px 0; font-size: 14px; color: #4f46e5; font-weight: 600;">${preferredDaysFormatted || 'Non spécifiés'}</td>
                            </tr>
                            ${request.notes ? `
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">💬 Notes</td>
                                <td style="padding: 8px 0; font-size: 14px; font-style: italic;">"${request.notes}"</td>
                            </tr>` : ''}
                        </table>
                        <div style="margin-top: 24px; text-align: center;">
                            <a href="${dashboardUrl}" style="background: #4f46e5; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">
                                Répondre dans le dashboard →
                            </a>
                        </div>
                    </div>
                </div>
            `
        });
    } catch (e) {
        console.error('[BookingRequest] Failed to send admin notification:', e);
    }
}

// ─── Email: Client confirmation of slot ──────────────────────────────────────
async function sendConfirmationToClient(client: any, request: any, property: any) {
    const config = await getEmailConfig(request.division);
    if (!config.resend || !client.email) return;

    const isEn = client.language === 'EN';
    const locale = isEn ? enCA : fr;
    const confirmedDate = new Date(request.confirmedDate);
    const period = request.confirmedPeriod;

    const dateFormatted = format(confirmedDate, "EEEE d MMMM yyyy", { locale });
    const periodLabel = period === 'AM'
        ? (isEn ? 'Morning (before noon)' : 'Avant-midi (avant 12h)')
        : period === 'PM'
            ? (isEn ? 'Afternoon (after noon)' : 'Après-midi (après 12h)')
            : '';

    const subject = isEn
        ? `✅ Your appointment is confirmed — ${config.companyName}`
        : `✅ Votre rendez-vous est confirmé — ${config.companyName}`;

    const html = isEn ? `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
            <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">✅ Appointment Confirmed</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0;">Thank you for choosing ${config.companyName}.</p>
            </div>
            <div style="background: white; padding: 28px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="font-size: 16px;">Hello <strong>${client.name}</strong>,</p>
                <p style="font-size: 15px; color: #475569;">Your technician has confirmed your appointment. Here are the details:</p>

                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 20px; margin: 20px 0;">
                    <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                        <span style="font-size: 24px;">📅</span>
                        <div>
                            <div style="font-size: 13px; color: #64748b; margin-bottom: 2px;">DATE</div>
                            <div style="font-size: 17px; font-weight: 700; text-transform: capitalize;">${dateFormatted}</div>
                        </div>
                    </div>
                    ${periodLabel ? `
                    <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                        <span style="font-size: 24px;">🕐</span>
                        <div>
                            <div style="font-size: 13px; color: #64748b; margin-bottom: 2px;">TIME</div>
                            <div style="font-size: 17px; font-weight: 700;">${periodLabel}</div>
                        </div>
                    </div>` : ''}
                    <div style="display: flex; gap: 12px;">
                        <span style="font-size: 24px;">📍</span>
                        <div>
                            <div style="font-size: 13px; color: #64748b; margin-bottom: 2px;">ADDRESS</div>
                            <div style="font-size: 15px; font-weight: 600;">${property?.address || '—'}</div>
                        </div>
                    </div>
                </div>

                ${request.adminNotes ? `<p style="font-size: 14px; color: #475569; background: #fffbeb; border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 4px;">📝 ${request.adminNotes}</p>` : ''}

                <p style="font-size: 14px; color: #64748b; margin-top: 24px;">If you have any questions, please don't hesitate to contact us.</p>
                <p style="font-size: 14px;">Thank you,<br/><strong>The ${config.companyName} Team</strong></p>
            </div>
        </div>
    ` : `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
            <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">✅ Rendez-vous confirmé</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0;">Merci de faire confiance à ${config.companyName}.</p>
            </div>
            <div style="background: white; padding: 28px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="font-size: 16px;">Bonjour <strong>${client.name}</strong>,</p>
                <p style="font-size: 15px; color: #475569;">Votre technicien a confirmé votre rendez-vous. Voici les détails :</p>

                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 20px; margin: 20px 0;">
                    <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                        <span style="font-size: 24px;">📅</span>
                        <div>
                            <div style="font-size: 13px; color: #64748b; margin-bottom: 2px;">DATE</div>
                            <div style="font-size: 17px; font-weight: 700; text-transform: capitalize;">${dateFormatted}</div>
                        </div>
                    </div>
                    ${periodLabel ? `
                    <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                        <span style="font-size: 24px;">🕐</span>
                        <div>
                            <div style="font-size: 13px; color: #64748b; margin-bottom: 2px;">PÉRIODE</div>
                            <div style="font-size: 17px; font-weight: 700;">${periodLabel}</div>
                        </div>
                    </div>` : ''}
                    <div style="display: flex; gap: 12px;">
                        <span style="font-size: 24px;">📍</span>
                        <div>
                            <div style="font-size: 13px; color: #64748b; margin-bottom: 2px;">ADRESSE</div>
                            <div style="font-size: 15px; font-weight: 600;">${property?.address || '—'}</div>
                        </div>
                    </div>
                </div>

                ${request.adminNotes ? `<p style="font-size: 14px; color: #475569; background: #fffbeb; border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 4px;">📝 ${request.adminNotes}</p>` : ''}

                <p style="font-size: 14px; color: #64748b; margin-top: 24px;">Pour toute question, n'hésitez pas à nous contacter.</p>
                <p style="font-size: 14px;">Merci,<br/><strong>L'équipe ${config.companyName}</strong></p>
            </div>
        </div>
    `;

    try {
        await config.resend.emails.send({
            from: config.from,
            to: client.email,
            subject,
            html,
        });
    } catch (e) {
        console.error('[BookingRequest] Failed to send client confirmation:', e);
    }
}

// ─── Create a booking request (called from client portal) ────────────────────
export async function createBookingRequest(data: {
    bookingToken: string;        // The BookingLink token to identify client
    serviceId?: string;
    propertyId?: string;
    preferredDays: string[];     // ISO date strings
    notes?: string;
    division?: string;
}) {
    // 1. Verify booking link and get client
    // @ts-ignore
    const link = await prisma.bookingLink.findUnique({
        where: { token: data.bookingToken },
        include: { client: { include: { properties: true } } }
    });

    if (!link) return { success: false, error: 'Invalid booking link' };
    if (link.status !== 'ACTIVE') return { success: false, error: 'Booking link expired' };
    if (new Date() > link.expiresAt) return { success: false, error: 'Booking link expired' };

    const client = link.client;
    const propertyId = data.propertyId || client.properties[0]?.id;
    const property = propertyId ? client.properties.find(p => p.id === propertyId) : null;
    const division = (data.division || (link as any).division || 'EXTERMINATION') as string;

    // 2. Create BookingRequest
    // @ts-ignore
    const request = await prisma.bookingRequest.create({
        data: {
            clientId: client.id,
            serviceId: data.serviceId || null,
            propertyId: propertyId || null,
            division: division as any,
            preferredDays: data.preferredDays,
            notes: data.notes || null,
            status: 'PENDING',
        }
    });

    // 3. Notify admin via email
    await sendNewRequestNotification(request, client, property, division);

    // 4. Mark booking link as USED so client cant spam requests
    // @ts-ignore
    await prisma.bookingLink.update({
        where: { id: link.id },
        data: { status: 'USED' }
    });

    revalidatePath('/booking-requests');

    return { success: true, requestId: request.id };
}

// ─── Get all pending booking requests (admin dashboard) ──────────────────────
export async function getPendingBookingRequests(division?: string) {
    // @ts-ignore
    const requests = await prisma.bookingRequest.findMany({
        where: {
            status: 'PENDING',
            ...(division ? { division: division as any } : {}),
        },
        include: {
            client: { select: { id: true, name: true, companyName: true, email: true, phone: true, language: true } },
        },
        orderBy: { createdAt: 'asc' }
    });

    // BookingRequest has no Prisma relation to Property — fetch separately
    const withProperty = await Promise.all(
        requests.map(async (req: any) => {
            if (!req.propertyId) return { ...req, property: null };
            const property = await prisma.property.findUnique({
                where: { id: req.propertyId },
                select: { id: true, address: true, latitude: true, longitude: true, city: true }
            });
            return { ...req, property };
        })
    );

    return JSON.parse(JSON.stringify(withProperty));
}

// ─── Confirm a booking request + auto-create Job + send email ────────────────
export async function confirmBookingRequest(requestId: string, data: {
    confirmedDate: string;        // ISO datetime "2026-04-20T08:00:00"
    confirmedPeriod: 'AM' | 'PM';
    confirmedTechId?: string;
    adminNotes?: string;
    serviceId?: string;          // Product ID for the job
}) {
    // 1. Fetch request with relations
    // @ts-ignore
    const request = await prisma.bookingRequest.findUnique({
        where: { id: requestId },
        include: {
            client: true,
        }
    });

    // Fetch property separately (no Prisma relation defined on BookingRequest)
    const property = (request as any)?.propertyId
        ? await prisma.property.findUnique({ where: { id: (request as any).propertyId } })
        : null;

    if (!request) return { success: false, error: 'Request not found' };
    if (request.status !== 'PENDING') return { success: false, error: 'Already processed' };

    const client = request.client as any;

    // 2. Determine scheduledAt from date + period
    const baseDate = new Date(data.confirmedDate);
    // AM → 9:00, PM → 13:00 as default start
    const startHour = data.confirmedPeriod === 'AM' ? 9 : 13;
    const scheduledAt = new Date(baseDate);
    scheduledAt.setHours(startHour, 0, 0, 0);
    const scheduledEndAt = addMinutes(scheduledAt, 120); // 2h default duration

    // 3. Auto-create the Job
    const technicianConnect = data.confirmedTechId
        ? { connect: [{ id: data.confirmedTechId }] }
        : undefined;

    let job = null;
    if (request.propertyId) {
        job = await prisma.job.create({
            data: {
                propertyId: request.propertyId,
                scheduledAt,
                scheduledEndAt,
                division: request.division as any,
                description: `Demande portail client — ${client.name}`,
                status: 'PENDING',
                ...(technicianConnect ? { technicians: technicianConnect } : {}),
            }
        });
    }

    // 4. Update BookingRequest
    // @ts-ignore
    await prisma.bookingRequest.update({
        where: { id: requestId },
        data: {
            status: 'BOOKED',
            confirmedDate: scheduledAt,
            confirmedPeriod: data.confirmedPeriod,
            confirmedTechId: data.confirmedTechId || null,
            adminNotes: data.adminNotes || null,
            jobId: job?.id || null,
        }
    });

    // 5. Send confirmation email to client
    const updatedRequest = {
        ...request,
        confirmedDate: scheduledAt,
        confirmedPeriod: data.confirmedPeriod,
        adminNotes: data.adminNotes,
        division: request.division,
    };
    await sendConfirmationToClient(client, updatedRequest, property);

    revalidatePath('/booking-requests');
    revalidatePath('/calendar');
    revalidatePath('/jobs');

    return { success: true, jobId: job?.id };
}

// ─── Cancel a booking request ─────────────────────────────────────────────────
export async function cancelBookingRequest(requestId: string) {
    // @ts-ignore
    await prisma.bookingRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' }
    });
    revalidatePath('/booking-requests');
    return { success: true };
}

// ─── Count pending requests (for badge) ──────────────────────────────────────
export async function getPendingRequestCount(division?: string): Promise<number> {
    // @ts-ignore
    return await prisma.bookingRequest.count({
        where: {
            status: 'PENDING',
            ...(division ? { division: division as any } : {}),
        }
    });
}
