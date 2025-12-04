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
}) {
    const { technicianIds, ...rest } = data;
    await prisma.job.update({
        where: { id },
        data: {
            ...rest,
            technicians: technicianIds ? {
                set: technicianIds.map(id => ({ id }))
            } : undefined,
        },
    });
    revalidatePath('/calendar');
}

export async function deleteCalendarJob(id: string) {
    await prisma.job.delete({
        where: { id },
    });
    revalidatePath('/calendar');
}
