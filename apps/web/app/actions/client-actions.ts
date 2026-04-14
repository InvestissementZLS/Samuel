'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createBookingLink, sendPortalLink } from './booking-actions';
import { sendPortalAccessEmail } from '@/lib/email';

export async function createClient(data: {
    name: string;
    companyName?: string;
    email?: string;
    phone?: string;
    billingAddress?: string;
    serviceAddress?: string; // Optional separate service address
    divisions?: ("EXTERMINATION" | "ENTREPRISES" | "RENOVATION")[];
    language?: "EN" | "FR";
}) {
    const serviceAddr = data.serviceAddress || data.billingAddress;
    const client = await prisma.client.create({
        data: {
            name: data.name,
            companyName: data.companyName || null,
            email: data.email || null,
            phone: data.phone || null,
            billingAddress: data.billingAddress || null,
            divisions: data.divisions || ["EXTERMINATION"],
            language: data.language || "FR",
            // Auto-create property if service address is provided
            properties: serviceAddr ? {
                create: {
                    address: serviceAddr,
                    type: 'RESIDENTIAL' // Default
                }
            } : undefined
        },
        include: {
            properties: true
        }
    });
    revalidatePath('/clients');
    return client;
}

// Combined action: create client + optionally send booking link
export async function createClientAndSendLink(data: {
    name: string;
    companyName?: string;
    email?: string;
    phone?: string;
    billingAddress?: string;
    serviceAddress?: string;
    divisions?: ("EXTERMINATION" | "ENTREPRISES" | "RENOVATION")[];
    language?: "EN" | "FR";
    sendLink: boolean;
    preferredDays?: string[]; // ISO date strings
    preferredPeriod?: 'AM' | 'PM';
    division?: "EXTERMINATION" | "ENTREPRISES" | "RENOVATION";
}) {
    const client = await createClient({
        name: data.name,
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
        billingAddress: data.billingAddress,
        serviceAddress: data.serviceAddress,
        divisions: data.divisions,
        language: data.language,
    });

    let bookingToken: string | null = null;
    let emailSent = false;

    if (data.sendLink && data.email) {
        const token = await createBookingLink(
            client.id,
            data.division || 'EXTERMINATION',
            data.preferredDays || [],
            data.preferredPeriod
        );
        bookingToken = token;

        // Send email
        try {
            await sendPortalAccessEmail(client as any, token);
            emailSent = true;
        } catch (e) {
            console.error('Failed to send booking link email:', e);
        }
    }

    revalidatePath('/clients');
    return { client, bookingToken, emailSent };
}

export async function updateClient(id: string, data: {
    name?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    billingAddress?: string;
    divisions?: ("EXTERMINATION" | "ENTREPRISES" | "RENOVATION")[];
    language?: "EN" | "FR";
}) {
    await prisma.client.update({
        where: { id },
        data,
    });
    revalidatePath('/clients');
}

export async function deleteClient(id: string, force: boolean = false) {
    if (force) {
        // Cascade delete manually (safest approach without relying on DB constraints)

        // 1. Get all client properties
        const properties = await prisma.property.findMany({
            where: { clientId: id },
            select: { id: true }
        });
        const propertyIds = properties.map(p => p.id);

        // 2. Delete Jobs associated with these properties
        // We need to delete job related data first if not cascaded
        const jobs = await prisma.job.findMany({
            where: { propertyId: { in: propertyIds } },
            select: { id: true }
        });
        const jobIds = jobs.map(j => j.id);

        if (jobIds.length > 0) {
            // Delete Job relations
            await prisma.jobNote.deleteMany({ where: { jobId: { in: jobIds } } });
            await prisma.jobPhoto.deleteMany({ where: { jobId: { in: jobIds } } });
            await prisma.usedProduct.deleteMany({ where: { jobId: { in: jobIds } } });
            await prisma.jobActivity.deleteMany({ where: { jobId: { in: jobIds } } });

            // Delete Jobs (Soft Delete)
            await prisma.job.updateMany({ 
                where: { id: { in: jobIds } },
                data: { isDeleted: true, deletedAt: new Date() }
            });
        }

        // 3. Delete Properties (Soft Delete)
        if (propertyIds.length > 0) {
            await prisma.property.updateMany({ 
                where: { id: { in: propertyIds } },
                data: { isDeleted: true, deletedAt: new Date() }
            });
        }

        // 4. Delete Client direct relations
        await prisma.invoice.updateMany({ 
            where: { clientId: id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        await prisma.quote.updateMany({ 
            where: { clientId: id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        await prisma.clientNote.deleteMany({ where: { clientId: id } });
        await prisma.bookingLink.deleteMany({ where: { clientId: id } });
    }

    // 5. Finally delete the client (Soft Delete)
    await prisma.client.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() }
    });
    revalidatePath('/clients');
}

export async function checkClientDuplicates(data: {
    name: string;
    email?: string;
    phone?: string;
    division?: "EXTERMINATION" | "ENTREPRISES" | "RENOVATION";
}) {
    // 1. Build dynamic OR conditions
    const conditions: any[] = [];
    const divisionFilter = data.division ? {
        divisions: {
            has: data.division
        }
    } : {};

    // Always check name (case-insensitive if possible, but Prisma default is usually sensitive depending on DB)
    // We'll use contains for partial match or equals. User asked for "similar", but for safety let's do strict name check
    // or very loose check? "se ressemble" -> looks like.
    // Let's try to match strict name OR email OR phone.

    if (data.name) {
        conditions.push({
            name: {
                contains: data.name.trim(),
                mode: 'insensitive' // Requires PostgreSQL
            },
            ...divisionFilter
        });
    }

    if (data.email) {
        conditions.push({
            email: {
                equals: data.email,
                mode: 'insensitive'
            },
            ...divisionFilter
        });
    }

    if (data.phone) {
        // Basic phone cleanup for comparison could be good, but strict for now
        conditions.push({
            phone: {
                contains: data.phone
            },
            ...divisionFilter
        });
    }

    if (conditions.length === 0) return [];

    const duplicates = await prisma.client.findMany({
        where: {
            AND: [
                { isDeleted: false },
                { OR: conditions }
            ]
        },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            billingAddress: true,
            createdAt: true
        },
        take: 5 // Limit results
    });

    return duplicates;
}
