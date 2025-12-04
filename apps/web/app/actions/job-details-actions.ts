'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { JobStatus } from '@prisma/client';
import { cookies } from 'next/headers';

async function logJobActivity(jobId: string, action: string, details?: string) {
    const cookieStore = await cookies();
    const userId = cookieStore.get("auth_token")?.value;

    await prisma.jobActivity.create({
        data: {
            jobId,
            userId,
            action,
            details,
        },
    });
}

export async function updateJobStatus(id: string, status: JobStatus) {
    await prisma.job.update({
        where: { id },
        data: { status },
    });
    await logJobActivity(id, 'STATUS_CHANGE', `Status updated to ${status}`);
    revalidatePath(`/jobs/${id}`);
}

export async function addJobNote(jobId: string, content: string) {
    await prisma.jobNote.create({
        data: {
            jobId,
            content,
        },
    });
    await logJobActivity(jobId, 'NOTE_ADDED', 'Added a note');
    revalidatePath(`/jobs/${jobId}`);
}

export async function deleteJobNote(id: string, jobId: string) {
    await prisma.jobNote.delete({
        where: { id },
    });
    revalidatePath(`/jobs/${jobId}`);
}

export async function addJobPhoto(jobId: string, url: string, caption?: string) {
    await prisma.jobPhoto.create({
        data: {
            jobId,
            url,
            caption,
        },
    });
    await logJobActivity(jobId, 'PHOTO_ADDED', 'Added a photo');
    revalidatePath(`/jobs/${jobId}`);
}

export async function addProductUsed(
    jobId: string,
    productId: string,
    quantity: number,
    locationIds: string[] = [],
    pestIds: string[] = [],
    methodIds: string[] = []
) {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value; // Fixed: was auth_token, but we use userId cookie elsewhere

    await prisma.$transaction(async (tx) => {
        // 1. Record usage
        await tx.usedProduct.create({
            data: {
                jobId,
                productId,
                quantity,
                locations: {
                    connect: locationIds.map(id => ({ id }))
                },
                pests: {
                    connect: pestIds.map(id => ({ id }))
                },
                methods: {
                    connect: methodIds.map(id => ({ id }))
                }
            },
        });

        // 2. Decrement User Inventory (if user is known)
        if (userId) {
            const inventoryItem = await tx.inventoryItem.findUnique({
                where: {
                    productId_userId: {
                        productId,
                        userId
                    }
                }
            });

            if (inventoryItem) {
                await tx.inventoryItem.update({
                    where: { id: inventoryItem.id },
                    data: { quantity: { decrement: quantity } }
                });
            } else {
                // Create negative inventory to track usage
                await tx.inventoryItem.create({
                    data: {
                        productId,
                        userId,
                        quantity: -quantity
                    }
                });
            }
        }
    });

    await logJobActivity(jobId, 'PRODUCT_USED', `Used product (Qty: ${quantity})`);
    revalidatePath(`/jobs/${jobId}`);
}

export async function removeProductUsed(id: string, jobId: string) {
    await prisma.usedProduct.delete({
        where: { id },
    });
    revalidatePath(`/jobs/${jobId}`);
}

export async function updateJobTechnicians(jobId: string, technicianIds: string[]) {
    // Use set to avoid duplicates just in case
    const uniqueIds = Array.from(new Set(technicianIds));

    await prisma.job.update({
        where: { id: jobId },
        data: {
            technicians: {
                set: uniqueIds.map(id => ({ id })),
            },
        },
    });
    await logJobActivity(jobId, 'TECHNICIANS_UPDATED', 'Updated assigned technicians');
    revalidatePath(`/jobs/${jobId}`);
}
