'use server';

import { prisma } from '@/lib/prisma';
import { addDays, addMonths, startOfMonth, endOfMonth, isWithinInterval, setYear } from 'date-fns';
import { revalidatePath } from 'next/cache';

/**
 * Checks if a date falls within the product's allowed season.
 */
export async function checkSeasonality(date: Date, productId: string) {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { seasonStartMonth: true, seasonEndMonth: true, name: true }
    });

    if (!product || !product.seasonStartMonth || !product.seasonEndMonth) {
        return { allowed: true };
    }

    const month = date.getMonth() + 1; // 1-12
    const { seasonStartMonth, seasonEndMonth } = product;

    // Handle wrap-around (e.g. Nov to Feb) though unlikely for extermination
    let isAllowed = false;
    if (seasonStartMonth <= seasonEndMonth) {
        isAllowed = month >= seasonStartMonth && month <= seasonEndMonth;
    } else {
        isAllowed = month >= seasonStartMonth || month <= seasonEndMonth;
    }

    if (!isAllowed) {
        return {
            allowed: false,
            message: `${product.name} is only available between months ${seasonStartMonth} and ${seasonEndMonth}.`
        };
    }

    return { allowed: true };
}

/**
 * Generates follow-up jobs based on the product's recurrence blueprint.
 * Should be called when a Job is created or verified.
 */
export async function generateFollowUpJobs(parentJobId: string) {
    const parentJob = await prisma.job.findUnique({
        where: { id: parentJobId },
        include: {
            products: {
                include: { product: true }
            },
            property: true,
            childJobs: true // Check existing
        }
    });

    if (!parentJob) throw new Error("Job not found");

    // Check if already generated
    if (parentJob.childJobs.length > 0) {
        return { count: 0, message: "Follow-ups already exist" };
    }

    let createdCount = 0;

    // 1. Handle Regular Recurrence Blueprint
    // Find the primary recurring service
    const recurringService = parentJob.products.find(p => p.product.isRecurring && p.product.recurrenceIntervalDays);

    if (recurringService) {
        const interval = recurringService.product.recurrenceIntervalDays || 14;
        const totalVisits = recurringService.product.numberOfVisits || 2;
        const followUpsNeeded = totalVisits - 1;

        if (followUpsNeeded > 0) {
            let nextDate = parentJob.scheduledAt;
            for (let i = 1; i <= followUpsNeeded; i++) {
                nextDate = addDays(nextDate, interval);
                await prisma.job.create({
                    data: {
                        propertyId: parentJob.propertyId,
                        status: 'PENDING',
                        scheduledAt: nextDate,
                        description: `Follow-up #${i} - ${recurringService.product.name} (Auto-generated)`,
                        division: parentJob.division,
                        parentJobId: parentJob.id,
                    }
                });
                createdCount++;
            }
        }

        // Warranty logic for recurrence completion
        if (recurringService.product.warrantyMonths) {
            await updateWarranty(parentJob.propertyId, recurringService.product.warrantyMonths);
        }
    }

    // 2. Handle Packages Loop (Included Services)
    const packageProduct = parentJob.products.find(p => p.product.isPackage);
    if (packageProduct) {
        // Fetch full package details including included services
        const fullPackage = await prisma.product.findUnique({
            where: { id: packageProduct.productId },
            include: { includedServices: { include: { childProduct: true } } }
        });

        if (fullPackage && fullPackage.includedServices.length > 0) {
            for (const item of fullPackage.includedServices) {
                const service = item.childProduct;
                // Determine Schedule Date (Deferred logic)
                let targetDate = new Date(); // Default now
                const currentMonth = targetDate.getMonth() + 1;

                // If seasonal and currently out of season (e.g. Winter vs Summer service)
                if (service.seasonStartMonth) {
                    // If we are before the start month, schedule for start month this year
                    if (currentMonth < service.seasonStartMonth) {
                        targetDate = new Date(targetDate.getFullYear(), service.seasonStartMonth - 1, 1);
                    }
                    // If we are AFTER end month, schedule for start month NEXT year
                    else if (service.seasonEndMonth && currentMonth > service.seasonEndMonth) {
                        targetDate = new Date(targetDate.getFullYear() + 1, service.seasonStartMonth - 1, 1);
                    }
                    // If we are IN season, schedule it Pending for now (Backlog)
                    else {
                        // Keep it PENDING for manual scheduling
                    }
                }

                // Create the Included Job
                await prisma.job.create({
                    data: {
                        propertyId: parentJob.propertyId,
                        status: 'PENDING',
                        scheduledAt: targetDate,
                        description: `Included Service: ${service.name} (Package: ${fullPackage.name})`,
                        division: parentJob.division,
                        parentJobId: parentJob.id,
                        // Add the product to this new job so we know what it is
                        products: {
                            create: {
                                productId: service.id,
                                unitPrice: 0, // Included
                                quantity: 1,
                                total: 0
                            }
                        }
                    }
                });
                createdCount++;
            }
        }
    }

    revalidatePath('/jobs');
    return { count: createdCount };
}

/**
 * Updates or Extends warranty on a property.
 */
export async function updateWarranty(propertyId: string, monthsToAdd: number) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return;

    let newExpiry = property.warrantyExpiresAt
        ? (property.warrantyExpiresAt > new Date() ? property.warrantyExpiresAt : new Date())
        : new Date();

    newExpiry = addMonths(newExpiry, monthsToAdd);

    await prisma.property.update({
        where: { id: propertyId },
        data: { warrantyExpiresAt: newExpiry }
    });
}


/**
 * Returns list of active treatment chains (Client/Jobs with active follow-ups).
 */
export async function getActiveTreatments() {
    // Find jobs that are active parents or children in a chain
    // Simplified: Find Parent Jobs created recently that have children
    const recentParents = await prisma.job.findMany({
        where: {
            parentJobId: null,
            childJobs: { some: {} }, // Has children
            scheduledAt: { gte: addMonths(new Date(), -6) } // Recent
        },
        include: {
            property: { include: { client: true } },
            childJobs: {
                orderBy: { scheduledAt: 'asc' }
            },
            products: { include: { product: true } }
        },
        orderBy: { scheduledAt: 'desc' }
    });

    return recentParents.map(parent => {
        const product = parent.products.find(p => p.product.isRecurring)?.product.name || "Treatment";
        const lastChild = parent.childJobs[parent.childJobs.length - 1];
        const isComplete = lastChild?.status === 'COMPLETED';

        return {
            id: parent.id,
            clientName: parent.property.client.name,
            serviceName: product,
            startDate: parent.scheduledAt,
            status: isComplete ? 'COMPLETED' : 'IN_PROGRESS',
            nextVisit: parent.childJobs.find(j => j.status === 'PENDING' || j.status === 'SCHEDULED')?.scheduledAt,
            totalVisits: parent.childJobs.length + 1
        };
    });
}
