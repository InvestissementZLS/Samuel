'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PropertyType } from '@prisma/client';

export async function createProperty(data: {
    clientId: string;
    street: string;
    city: string;
    postalCode: string;
    province?: string;
    country?: string;
    type: PropertyType;
    accessInfo?: string;
}) {
    // Construct full address for backward compatibility if needed, or just store it.
    // The schema still has 'address' as required string based on previous view? 
    // Let's verify schema. If address is required, we synthesize it.
    const fullAddress = `${data.street}, ${data.city}, ${data.postalCode}`;

    await prisma.property.create({
        data: {
            clientId: data.clientId,
            address: fullAddress, // Keep for legacy/search
            street: data.street,
            city: data.city,
            postalCode: data.postalCode,
            province: data.province || 'QC',
            country: data.country || 'Canada',
            type: data.type,
            accessInfo: data.accessInfo || null,
        },
    });
    revalidatePath(`/clients/${data.clientId}`);
}

export async function updateProperty(id: string, data: {
    street?: string;
    city?: string;
    postalCode?: string;
    province?: string;
    country?: string;
    type?: PropertyType;
    accessInfo?: string;
}) {
    // If updating address parts, we should update the composite address too
    // This is tricky without fetching first if partial update.
    // For now assuming full update from dialog.

    const updateData: any = { ...data };

    if (data.street && data.city && data.postalCode) {
        updateData.address = `${data.street}, ${data.city}, ${data.postalCode}`;
    }

    const property = await prisma.property.update({
        where: { id },
        data: updateData,
    });
    revalidatePath(`/clients/${property.clientId}`);
}

export async function deleteProperty(id: string) {
    const property = await prisma.property.delete({
        where: { id },
    });
    revalidatePath(`/clients/${property.clientId}`);
}
