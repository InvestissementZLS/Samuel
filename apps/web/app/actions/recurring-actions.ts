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
            where: { id: packageProduct.productId },
            include: { includedServices: { include: { childProduct: true }, orderBy: { order: 'asc' } } }
        });

        if (fullPackage && fullPackage.includedServices.length > 0) {
            for (const item of fullPackage.includedServices) {
                const service = item.childProduct;
                const service = item.childProduct;
                // Timeline Logic
                // Base date is parent job date + delay
                let targetDate = addDays(parentJob.scheduledAt, item.delayDays || 0);

                // Seasonality Check (Simple Spring logic: April-June)
                if (item.seasonality === 'SPRING_ONLY') {
                    const month = targetDate.getMonth() + 1; // 1-12
                    // If before April, move to April same year
                    if (month < 4) {
                        targetDate = new Date(targetDate.getFullYear(), 3, 1); // April 1st
                    }
                    // If after June, move to April NEXT year
                    else if (month > 6) {
                        targetDate = new Date(targetDate.getFullYear() + 1, 3, 1); // April 1st next year
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
export async function updateWarranty(propertyId: string, monthsToAdd: number, fromDate?: Date) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return;

    // Use provided date (e.g. Invoice Date) or current date/existing expiry
    const baseDate = fromDate || new Date();

    // Calculate new potential expiry
    // If fromDate is provided (e.g. Invoice Sent), we calculate STRICTLY from that date (Contract Start + Duration)
    // Otherwise we use legacy logic (Extend existing or start from now)
    let calculatedExpiry: Date;

    if (fromDate) {
        calculatedExpiry = addMonths(fromDate, monthsToAdd);
    } else {
        // Legacy/Default: Extend from existing active warranty OR from now
        const currentExpiry = property.warrantyExpiresAt;
        const startPoint = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
        calculatedExpiry = addMonths(startPoint, monthsToAdd);
    }

    // Safety: Don't reduce an existing warranty if it's already longer (unless explicit override? No, usually beneficial to keep longer)
    // But user asked to "start from invoice". If invoice is old, it might be in past? No, assumes new invoice.
    // If client has warranty until 2030, and we send new invoice for 1 year, we probably shouldn't reduce it.
    const currentExpiry = property.warrantyExpiresAt;
    if (currentExpiry && currentExpiry > calculatedExpiry) {
        // Keep existing if longer
        return;
    }

    await prisma.property.update({
        where: { id: propertyId },
        data: { warrantyExpiresAt: calculatedExpiry }
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
