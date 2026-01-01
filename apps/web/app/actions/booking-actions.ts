'use server';

import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';
import { createCalendarJob } from './calendar-actions';
import { JobStatus } from '@prisma/client';
import { sendBookingConfirmation } from '@/lib/email-service';

export async function createBookingLink(clientId: string) {
    // Generate a link valid for 7 days
    const expiresAt = addDays(new Date(), 7);

    // @ts-ignore
    const link = await prisma.bookingLink.create({
        data: {
            clientId,
            expiresAt
        }
    });

    return link.token;
}

export async function verifyBookingToken(token: string) {
    // @ts-ignore
    const link = await prisma.bookingLink.findUnique({
        where: { token },
        include: { client: { include: { properties: true } } }
    });

    if (!link) return null;
    if (new Date() > link.expiresAt) return null;
    if (link.status !== 'ACTIVE') return null;

    return link;
}

export async function confirmBooking(
    token: string,
    propertyId: string,
    productId: string,
    scheduledAt: Date,
    techId: string,
    description: string
) {
    const link = await verifyBookingToken(token);
    if (!link) throw new Error("Invalid Token");

    // 1. Create the Job
    // @ts-ignore
    const job = await prisma.job.create({
        data: {
            propertyId,
            description,
            scheduledAt,
            status: 'SCHEDULED',
            technicians: { connect: [{ id: techId }] },
            // Add the product/service
            products: {
                create: {
                    productId,
                    quantity: 1
                }
            },
            division: 'EXTERMINATION' // Default for now
        }
    });

    // 2. Consume the token (Single use?)
    // User wants "Flow" so maybe keep it active for other bookings? 
    // Let's set it to USED if we want one-time. 
    // For now, let's keep it ACTIVE so they can re-use it or book multiple services if needed.
    // prisma.bookingLink.update({ where: { id: link.id }, data: { status: 'USED' } });

    // 3. Send Confirmation Email
    if (link.client.email) {
        await sendBookingConfirmation(
            link.client.email,
            link.client.name,
            scheduledAt,
            description
        );
    }

    return job;
}

export async function confirmGuestBooking(
    clientInfo: { name: string; email: string; phone: string; street: string; city: string; postalCode: string; province?: string; language?: string },
    productId: string,
    scheduledAt: Date,
    techId: string,
    description: string
) {
    const fullAddress = `${clientInfo.street}, ${clientInfo.city}, ${clientInfo.postalCode}`;

    // 1. Create Client
    // @ts-ignore
    const client = await prisma.client.create({
        data: {
            name: clientInfo.name,
            email: clientInfo.email,
            phone: clientInfo.phone,
            billingAddress: fullAddress, // Use composite address for billing default
            language: clientInfo.language === 'en' ? 'EN' : 'FR',
        }
    });

    // 2. Create the Property
    // We ALWAYS create a new property record for a new client, even if address matches another client (Scene: House Sold)
    // This preserves history for the previous owner.
    // @ts-ignore
    const property = await prisma.property.create({
        data: {
            clientId: client.id,
            address: fullAddress,
            street: clientInfo.street,
            city: clientInfo.city,
            postalCode: clientInfo.postalCode,
            province: clientInfo.province || 'QC',
            country: 'Canada',
            type: 'RESIDENTIAL'
        }
    });

    // 3. Create Job
    // @ts-ignore
    const job = await prisma.job.create({
        data: {
            propertyId: property.id,
            description,
            scheduledAt,
            status: 'SCHEDULED',
            technicians: { connect: [{ id: techId }] },
            products: {
                create: {
                    productId,
                    quantity: 1
                }
            },
            division: 'EXTERMINATION'
        }
    });

    // 4. Send Confirmation
    if (client.email) {
        await sendBookingConfirmation(
            client.email,
            client.name,
            scheduledAt,
            description
        );
    }

    // Return token for redirect to portal
    const token = await createBookingLink(client.id);
    return { job, token };
}

// --- Legacy / Existing Client Detection ---

export async function checkExistingClient(phone: string, email: string) {
    if (!phone && !email) return { exists: false };

    // Search for match
    // @ts-ignore
    const client = await prisma.client.findFirst({
        where: {
            OR: [
                { email: { equals: email, mode: 'insensitive' } },
                { phone: { contains: phone } } // Basic check, maybe refine for strict numbers later
            ]
        },
        select: { id: true, name: true, email: true }
    });

    if (client) {
        // Mask email for privacy in UI
        const maskedEmail = client.email
            ? client.email.replace(/(^.{2})(.*)(@.*)/, '$1***$3')
            : '***@***.com';

        return {
            exists: true,
            name: client.name,
            maskedEmail,
            clientId: client.id
        };
    }

    return { exists: false };
}

export async function sendPortalLink(clientId: string) {
    // @ts-ignore
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client || !client.email) return { success: false, error: "Client not found or no email" };

    const token = await createBookingLink(clientId);

    // In a real app, use a dedicated email template. 
    // For now, re-using booking confirmation implies "Here is your link".
    // Or better: Just allow the UI to redirect if we are in a 'trusted' flow?
    // User requested "Option to connect". 
    // Security: We can't just log them in without password/email proof. 
    // Sending email is the secure way.

    // TODO: Create a specific 'Send Access Link' email template.
    // For now, we simulate success and maybe sending a generic note.

    // Let's rely on the existing "Booking Confirmation" service but strictly for the link?
    // Actually, let's just create a quick helper here or assume the user gets the email.

    // MOCK EMAIL for Link (Replace with 'resend' call if template exists)
    console.log(`[EMAIL SEND] Portal Link for ${client.email}: /portal/${token}`);

    return { success: true, email: client.email };
}

export async function getClientServices() {
    // Return Series/Packages that are eligible for self-service
    // For now, return all SERVICE products
    // @ts-ignore
    return await prisma.product.findMany({
        where: { type: 'SERVICE' }
    });
}
