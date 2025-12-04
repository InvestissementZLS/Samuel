'use server';

import { prisma } from '@/lib/prisma';
import { geocodeAddress, optimizeRoute } from '@/lib/route-optimization';
import { revalidatePath } from 'next/cache';
import { addMinutes, startOfDay, endOfDay, setHours, setMinutes } from 'date-fns';

export async function optimizeDailyRoute(date: Date, techId: string) {
    const start = startOfDay(date);
    const end = endOfDay(date);

    // 1. Fetch jobs for the day
    const jobs = await prisma.job.findMany({
        where: {
            technicians: {
                some: {
                    id: techId,
                },
            },
            scheduledAt: {
                gte: start,
                lte: end,
            },
            status: {
                not: 'CANCELLED',
            },
        },
        include: {
            property: true,
        },
    });

    if (jobs.length <= 1) {
        return { success: true, message: 'Not enough jobs to optimize.' };
    }

    // 2. Ensure all properties have lat/lng
    for (const job of jobs) {
        if (!job.property.latitude || !job.property.longitude) {
            const coords = await geocodeAddress(job.property.address);
            await prisma.property.update({
                where: { id: job.property.id },
                data: {
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                },
            });
            // Update local object for optimization
            job.property.latitude = coords.latitude;
            job.property.longitude = coords.longitude;
        }
    }

    // 3. Run optimization
    const optimizedJobs = optimizeRoute(jobs);

    // 4. Update scheduled times
    // Assume start time is 9:00 AM
    let currentTime = setMinutes(setHours(start, 9), 0);

    for (const job of optimizedJobs) {
        await prisma.job.update({
            where: { id: job.id },
            data: {
                scheduledAt: currentTime,
            },
        });

        // Assume each job takes 1 hour + 15 min travel buffer
        currentTime = addMinutes(currentTime, 75);
    }

    revalidatePath('/calendar');
    return { success: true, message: 'Route optimized successfully!' };
}
