'use server';

import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';
import { createCalendarJob } from './calendar-actions';
import { JobStatus } from '@prisma/client';

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
    // Or maybe update status?
    // prisma.bookingLink.update({ where: { id: link.id }, data: { status: 'USED' } });

    return job;
}

export async function getClientServices() {
    // Return Series/Packages that are eligible for self-service
    // For now, return all SERVICE products
    // @ts-ignore
    return await prisma.product.findMany({
        where: { type: 'SERVICE' }
    });
}
