'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createClient(data: {
    name: string;
    email?: string;
    phone?: string;
    billingAddress?: string;
    divisions?: ("EXTERMINATION" | "ENTREPRISES" | "RENOVATION")[];
    language?: "EN" | "FR";
}) {
    const client = await prisma.client.create({
        data: {
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            billingAddress: data.billingAddress || null,
            divisions: data.divisions || ["EXTERMINATION"],
            language: data.language || "FR",
            // Auto-create property if address is provided
            properties: data.billingAddress ? {
                create: {
                    address: data.billingAddress,
                    type: 'RESIDENTIAL' // Default
                }
            } : undefined
        },
        include: {
            properties: true // Return properties so frontend can use them
        }
    });
    revalidatePath('/clients');
    return client;
}

export async function updateClient(id: string, data: {
    name?: string;
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

            // Delete Jobs
            await prisma.job.deleteMany({ where: { id: { in: jobIds } } });
        }

        // 3. Delete Properties
        if (propertyIds.length > 0) {
            await prisma.property.deleteMany({ where: { id: { in: propertyIds } } });
        }

        // 4. Delete Client direct relations
        await prisma.invoice.deleteMany({ where: { clientId: id } });
        await prisma.quote.deleteMany({ where: { clientId: id } });
        await prisma.clientNote.deleteMany({ where: { clientId: id } });
        await prisma.bookingLink.deleteMany({ where: { clientId: id } });
    }

    // 5. Finally delete the client
    await prisma.client.delete({
        where: { id },
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
            OR: conditions
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
