'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { JobStatus } from '@prisma/client';

export async function createCalendarJob(data: {
    propertyId: string;
    description: string;
    scheduledAt: Date;
    scheduledEndAt?: Date;
    technicianIds?: string[];
    status?: JobStatus;
    division?: "EXTERMINATION" | "ENTREPRISES";
}) {
    await prisma.job.create({
        data: {
            propertyId: data.propertyId,
            description: data.description,
            scheduledAt: data.scheduledAt,
            scheduledEndAt: data.scheduledEndAt,
            technicians: data.technicianIds ? {
                connect: data.technicianIds.map(id => ({ id }))
            } : undefined,
            status: data.status || 'SCHEDULED',
            division: data.division || "EXTERMINATION",
        },
    });
    revalidatePath('/calendar');
}



export async function updateCalendarJob(id: string, data: {
    scheduledAt?: Date;
    scheduledEndAt?: Date;
    description?: string;
    technicianIds?: string[];
    propertyId?: string;
    status?: JobStatus;
    division?: "EXTERMINATION" | "ENTREPRISES";
    products?: { productId: string; quantity: number }[]; // [NEW] Support products/services
}) {
    const { technicianIds, products, ...rest } = data;

    // Prepare update data
    const updateData: any = {
        ...rest,
        technicians: technicianIds ? {
            set: technicianIds.map(id => ({ id }))
        } : undefined,
    };

    // If products are provided, we replace the existing ones for simplicity
    if (products) {
        updateData.products = {
            deleteMany: {}, // Remove specific old ones or all? Delete all is safest for "reset" behavior
            create: products.map(p => ({
                productId: p.productId,
                quantity: p.quantity
            }))
        };
    }

    await prisma.job.update({
        where: { id },
        data: updateData,
    });
    revalidatePath('/calendar');
}

export async function deleteCalendarJob(id: string) {
    await prisma.job.delete({
        where: { id },
    });
    revalidatePath('/calendar');
}
