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

export async function deleteClient(id: string) {
    await prisma.client.delete({
        where: { id },
    });
    revalidatePath('/clients');
}
