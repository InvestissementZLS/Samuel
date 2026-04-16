'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Supported fields that Jarvis can update on a client
export type UpdatableClientField = 'email' | 'phone' | 'companyName' | 'billingAddress' | 'name';

export interface FoundClient {
    id: string;
    name: string;
    companyName: string | null;
    phone: string | null;
    email: string | null;
    billingAddress: string | null;
}

export interface WriteIntent {
    type: 'write_intent';
    field: UpdatableClientField;
    value: string;
    clientSearch: string;
    candidates: FoundClient[];
    fieldLabel: string;
}

export interface ReadAnswer {
    type: 'answer';
    answer: string;
    error?: string;
}

// Search clients to find candidates for a write operation
export async function findClientsForUpdate(searchTerm: string, division?: string): Promise<FoundClient[]> {
    const terms = searchTerm.trim().split(/\s+/);
    const orConditions = terms.flatMap(term => [
        { name: { contains: term, mode: 'insensitive' as const } },
        { companyName: { contains: term, mode: 'insensitive' as const } },
    ]);

    const divisionFilter = division ? { divisions: { has: division as any } } : {};

    const clients = await prisma.client.findMany({
        where: {
            isDeleted: false,
            ...divisionFilter,
            OR: orConditions,
        },
        select: {
            id: true,
            name: true,
            companyName: true,
            phone: true,
            email: true,
            billingAddress: true,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
    });

    return clients;
}

// Execute the actual update after user confirmation
export async function executeClientUpdate(
    clientId: string,
    field: UpdatableClientField,
    value: string
): Promise<{ success: boolean; clientName: string; error?: string }> {
    try {
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { name: true }
        });

        if (!client) return { success: false, clientName: '', error: 'Client introuvable.' };

        await prisma.client.update({
            where: { id: clientId },
            data: { [field]: value || null },
        });

        revalidatePath('/clients');
        revalidatePath(`/clients/${clientId}`);

        return { success: true, clientName: client.name };
    } catch (error: any) {
        return { success: false, clientName: '', error: error?.message || 'Erreur lors de la mise à jour.' };
    }
}
