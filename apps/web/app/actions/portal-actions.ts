'use server';

import { prisma } from '@/lib/prisma';
import { addHours, isAfter } from 'date-fns';
import { revalidatePath } from 'next/cache';

// Validate token and fetch client data with jobs, invoices, and quotes
export async function getPortalData(token: string) {
    if (!token) return null;

    // Check if it's a "magic link" BookingLink
    // @ts-ignore
    const link = await prisma.bookingLink.findUnique({
        where: { token },
        include: {
            client: {
                include: {
                    quotes: {
                        orderBy: { createdAt: 'desc' },
                        include: {
                            items: { include: { product: true } }
                        }
                    },
                    invoices: {
                        where: { status: { not: 'CANCELLED' } },
                        orderBy: { createdAt: 'desc' },
                        include: {
                            items: { include: { product: true } }
                        }
                    },
                    properties: {
                        include: {
                            jobs: {
                                where: {
                                    status: { not: 'CANCELLED' }
                                },
                                orderBy: { scheduledAt: 'asc' },
                                include: {
                                    products: { include: { product: true } },
                                    technicians: { select: { name: true } }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!link) return null;

    // @ts-ignore
    return link.client;
}

export async function cancelJob(token: string, jobId: string) {
    // 1. Verify Identity
    const client = await getPortalData(token);
    if (!client || 'error' in client) {
        throw new Error("Unauthorized");
    }

    // 2. Find Job and verify it belongs to client
    const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { property: true }
    });

    if (!job) throw new Error("Job not found");

    // Check ownership (via property -> client)
    const property = await prisma.property.findUnique({
        where: { id: job.propertyId }
    });

    if (!property || property.clientId !== client.id) {
        throw new Error("Unauthorized access to this job");
    }

    // 3. Enforce 24h Policy
    const now = new Date();
    const minCancellationTime = addHours(now, 24);

    if (!isAfter(job.scheduledAt, minCancellationTime)) {
        throw new Error("Cancellation is only allowed 24 hours in advance.");
    }

    // 4. Cancel
    await prisma.job.update({
        where: { id: jobId },
        data: {
            // @ts-ignore
            status: 'CANCELLED',
            description: job.description + ` [Cancelled by Client via Portal]`
        }
    });

    revalidatePath(`/portal/${token}`);
    return { success: true };
}

export async function respondToQuote(token: string, quoteId: string, action: 'ACCEPTED' | 'REJECTED') {
    // 1. Verify Identity
    const client = await getPortalData(token);
    if (!client || 'error' in client) {
        throw new Error("Unauthorized");
    }

    // 2. Verify Quote ownership
    const quote = await prisma.quote.findUnique({
        where: { id: quoteId }
    });

    if (!quote || quote.clientId !== client.id) {
        throw new Error("Quote not found or unauthorized");
    }

    // 3. Update Status
    await prisma.quote.update({
        where: { id: quoteId },
        data: {
            // @ts-ignore
            status: action,
            signedAt: action === 'ACCEPTED' ? new Date() : null // Mark signed time if accepted
        }
    });

    revalidatePath(`/portal/${token}`);
    return { success: true };
}
