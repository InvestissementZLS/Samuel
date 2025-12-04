'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PropertyType } from '@prisma/client';

export async function createProperty(data: {
    clientId: string;
    address: string;
    type: PropertyType;
    accessInfo?: string;
}) {
    await prisma.property.create({
        data: {
            clientId: data.clientId,
            address: data.address,
            type: data.type,
            accessInfo: data.accessInfo || null,
        },
    });
    revalidatePath(`/clients/${data.clientId}`);
}

export async function updateProperty(id: string, data: {
    address?: string;
    type?: PropertyType;
    accessInfo?: string;
}) {
    const property = await prisma.property.update({
        where: { id },
        data,
    });
    revalidatePath(`/clients/${property.clientId}`);
}

export async function deleteProperty(id: string) {
    const property = await prisma.property.delete({
        where: { id },
    });
    revalidatePath(`/clients/${property.clientId}`);
}
