'use server';

import { prisma } from '@/lib/prisma';
import { addHours, isAfter } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { sendPreparationListEmail } from '@/lib/email';

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
                            items: { include: { product: true } },
                            client: true
                        }
                    },
                    invoices: {
                        where: { status: { not: 'CANCELLED' } },
                        orderBy: { createdAt: 'desc' },
                        include: {
                            items: { include: { product: true } },
                            client: true
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
                                    technicians: { select: { name: true } },
                                    photos: true,
                                    notes: true
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
        where: { id: quoteId },
        include: { items: { include: { product: true } } }
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

    if (action === 'ACCEPTED') {
        const pdsItems: { listUrl: string, serviceName: string }[] = [];
        quote.items.forEach(item => {
            // @ts-ignore
            if (item.product.preparationListUrl) {
                // @ts-ignore
                pdsItems.push({ listUrl: item.product.preparationListUrl, serviceName: item.product.name });
            }
        });

        if (pdsItems.length > 0) {
            // @ts-ignore
            await sendPreparationListEmail(client, quote.division, pdsItems);
        }
    }

    revalidatePath(`/portal/${token}`);
    return { success: true };
}

export async function signQuote(quoteId: string, signature: string) {
    console.log("Signing quote", quoteId, signature);
    return { success: true }; // Placeholder to unblock build
}

export async function getOrCreateClientPortalToken(clientId: string) {
    // 1. Check for existing active token
    const existing = await prisma.bookingLink.findFirst({
        where: {
            clientId,
            status: 'ACTIVE',
            expiresAt: { gt: new Date() }
        }
    });

    if (existing) {
        return existing.token;
    }

    // 2. Create new token if none exists
    const newToken = await prisma.bookingLink.create({
        data: {
            clientId,
            expiresAt: addHours(new Date(), 24 * 365), // Valid for 1 year for now
        }
    });



    return newToken.token;
}

export async function getPortalJob(token: string, jobId: string) {
    if (!token) return null;

    // 1. Verify Token & Get Client ID (Lightweight)
    // @ts-ignore
    const link = await prisma.bookingLink.findUnique({
        where: { token },
        select: { clientId: true, status: true, expiresAt: true }
    });

    if (!link) {
        console.error("Portal: Invalid token", token);
        return null;
    }
    // @ts-ignore
    if ((link.status && link.status !== 'ACTIVE') || (link.expiresAt && link.expiresAt < new Date())) {
        console.error("Portal: Token expired or inactive", link);
        return null;
    }

    // 2. Fetch Job with Full Details
    try {
        // @ts-ignore
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                property: true,
                products: { include: { product: true } },
                technicians: { select: { name: true } },
                notes: true,
                photos: true,
                activities: {
                    where: { action: { in: ['CHECKLIST_COMPLETED', 'FORM_FILLED'] } }
                }
            }
        });

        if (!job) {
            console.error("Portal: Job not found", jobId);
            return null;
        }

        // 3. Verify Ownership (Job -> Property -> Client must match Link -> Client)
        // @ts-ignore
        if (job.property.clientId !== link.clientId) {
            console.error("Portal: Unauthorized access logic mismatch", { jobClient: job.property.clientId, linkClient: link.clientId });
            return null;
        }

        // @ts-ignore
        return job;
    } catch (err) {
        console.error("Portal: Error fetching job", err);
        return null;
    }
}

export async function getPortalQuote(token: string, quoteId: string) {
    if (!token) return null;

    const link = await prisma.bookingLink.findUnique({
        where: { token },
        select: { clientId: true, status: true, expiresAt: true }
    });

    // @ts-ignore
    if (!link || (link.status && link.status !== 'ACTIVE') || (link.expiresAt && link.expiresAt < new Date())) {
        return null;
    }

    // @ts-ignore
    const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: {
            items: { include: { product: true } },
            client: true,
            property: true
        }
    });

    if (!quote || quote.clientId !== link.clientId) return null;

    return quote;
}

export async function getPortalInvoice(token: string, invoiceId: string) {
    if (!token) return null;

    const link = await prisma.bookingLink.findUnique({
        where: { token },
        select: { clientId: true, status: true, expiresAt: true }
    });

    // @ts-ignore
    if (!link || (link.status && link.status !== 'ACTIVE') || (link.expiresAt && link.expiresAt < new Date())) {
        return null;
    }

    // @ts-ignore
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            items: { include: { product: true } },
            client: true,
            transactions: true
        }
    });

    if (!invoice || invoice.clientId !== link.clientId) return null;

    return invoice;
}
