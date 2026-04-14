'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { JobStatus, Division } from '@prisma/client';
import { sendPushNotification } from '@/lib/notifications';
import { format } from 'date-fns';

export async function createCalendarJob(data: {
    propertyId: string;
    description: string;
    scheduledAt: Date;
    scheduledEndAt?: Date;
    technicianIds?: string[];
    status?: JobStatus;
    division?: Division;
    products?: { productId: string; quantity: number }[];
}) {
    const job = await prisma.job.create({
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
            products: data.products ? {
                create: data.products.map(p => ({
                    productId: p.productId,
                    quantity: p.quantity
                }))
            } : undefined
        },
        include: {
            property: { select: { client: { select: { name: true } } } }
        }
    });

    // Fire Push Notifications for assigned technicians
    if (data.technicianIds && data.technicianIds.length > 0) {
        const title = "Nouvelle tâche assignée !";
        const dateStr = format(data.scheduledAt, 'dd/MM à HH:mm');
        const clientName = job.property?.client?.name || "un client";
        const body = `On vous a ajouté une tâche d'ici le ${dateStr} pour ${clientName}.`;

        // Send notifications via parallel promises
        await Promise.all(data.technicianIds.map(techId => 
            sendPushNotification({
                targetUserId: techId,
                title,
                body,
                data: { jobId: job.id, type: 'NEW_JOB' }
            })
        ));
    }

    revalidatePath('/calendar');
}



export async function updateCalendarJob(id: string, data: {
    scheduledAt?: Date;
    scheduledEndAt?: Date;
    description?: string;
    technicianIds?: string[];
    propertyId?: string;
    status?: JobStatus;
    division?: Division;
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

    const updatedJob = await prisma.job.update({
        where: { id },
        data: updateData,
        include: { property: { select: { client: { select: { name: true } } } } }
    });

    if (technicianIds && technicianIds.length > 0) {
        const title = "Mise à jour d'une tâche !";
        const dateStr = format(updatedJob.scheduledAt, 'dd/MM à HH:mm');
        const clientName = updatedJob.property?.client?.name || "un client";
        const body = `Votre tâche du ${dateStr} pour ${clientName} a été modifiée.`;

        await Promise.all(technicianIds.map(techId => 
            sendPushNotification({
                targetUserId: techId,
                title,
                body,
                data: { jobId: updatedJob.id, type: 'UPDATE_JOB' }
            })
        ));
    }

    revalidatePath('/calendar');
}

export async function deleteCalendarJob(id: string) {
    await prisma.job.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() }
    });
    revalidatePath('/calendar');
}
