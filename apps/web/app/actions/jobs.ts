'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createJob(formData: FormData) {
    const propertyId = formData.get('propertyId') as string;
    const description = formData.get('description') as string;
    const scheduledDate = formData.get('scheduledDate') as string;
    const scheduledTime = formData.get('scheduledTime') as string;
    const techIds = formData.getAll('techId') as string[];

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`);

    await prisma.job.create({
        data: {
            propertyId,
            description,
            scheduledAt,
            technicians: techIds.length > 0 ? {
                connect: techIds.map(id => ({ id }))
            } : undefined,
            status: 'SCHEDULED',
        },
    });

    revalidatePath('/jobs');
    redirect('/jobs');
}

export async function updateJob(id: string, data: {
    scheduledAt?: Date;
    scheduledEndAt?: Date;
    description?: string;
    techIds?: string[];
    status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'IN_PROGRESS' | 'PENDING';
}) {
    // Validation: Check Seasonality if scheduling
    if (data.scheduledAt) {
        const { checkSeasonality } = await import('@/app/actions/recurring-actions');

        const job = await prisma.job.findUnique({
            where: { id },
            include: { products: { include: { product: true } } }
        });

        if (job) {
            for (const usedProduct of job.products) {
                const result = await checkSeasonality(data.scheduledAt, usedProduct.productId);
                if (!result.allowed) {
                    throw new Error(result.message || "Seasonality restriction");
                }
            }
        }
    }

    const { techIds, ...rest } = data;
    await prisma.job.update({
        where: { id },
        data: {
            ...rest,
            technicians: techIds ? {
                set: techIds.map(id => ({ id }))
            } : undefined,
        },
    });
    revalidatePath(`/jobs/${id}`); // Ensure detailed view is updated
    revalidatePath('/calendar');
    revalidatePath('/jobs');
}

export async function deleteJob(id: string) {
    await prisma.job.delete({
        where: { id },
    });
    revalidatePath('/calendar');
    revalidatePath('/jobs');
}
