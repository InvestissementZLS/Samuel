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
    clientInfo: { name: string; email: string; phone: string; address: string },
    productId: string,
    scheduledAt: Date,
    techId: string,
    description: string
) {
    // 1. Create Client & Property
    // @ts-ignore
    const client = await prisma.client.create({
        data: {
            name: clientInfo.name,
            email: clientInfo.email,
            phone: clientInfo.phone,
            billingAddress: clientInfo.address,
            properties: {
                create: {
                    address: clientInfo.address,
                    type: 'RESIDENTIAL'
                }
            }
        },
        include: { properties: true }
    });

    const propertyId = client.properties[0].id;

    // 2. Create Job
    // @ts-ignore
    const job = await prisma.job.create({
        data: {
            propertyId,
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


    // 3. Send Confirmation Email
    if (client.email) {
        await sendBookingConfirmation(
            client.email,
            client.name,
            scheduledAt,
            description
        );
    }

    return { client, job };
}

export async function getClientServices() {
    // Return Series/Packages that are eligible for self-service
    // For now, return all SERVICE products
    // @ts-ignore
    return await prisma.product.findMany({
        where: { type: 'SERVICE' }
    });
}
