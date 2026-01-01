'use server';

import { prisma } from '@/lib/prisma';
import { JobStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { differenceInMinutes } from 'date-fns';

export async function updateJobStatus(
    jobId: string,
    status: JobStatus,
    location?: { lat: number; lng: number }
) {
    if (!jobId) throw new Error("Job ID required");

    const job = await prisma.job.findUnique({
        where: { id: jobId }
    });

    if (!job) throw new Error("Job not found");

    const now = new Date();
    const data: any = { status };

    // --- State Transitions & Logic ---

    // 1. Starting Travel (SCHEDULED -> EN_ROUTE)
    if (status === 'EN_ROUTE') {
        data.enRouteAt = now;
        // Optional: Save start location to a JobActivity or similar log if needed
    }

    // 2. Arriving at Job (EN_ROUTE -> IN_PROGRESS)
    else if (status === 'IN_PROGRESS') {
        data.startedAt = now;

        // Calculate Travel Duration if we have enRouteAt
        if (job.enRouteAt) {
            const travelMinutes = differenceInMinutes(now, job.enRouteAt);
            data.travelDurationMinutes = travelMinutes > 0 ? travelMinutes : 0;
        }
    }

    // 3. Completing Job (IN_PROGRESS -> COMPLETED)
    else if (status === 'COMPLETED') {
        data.completedAt = now;

        // Calculate Actual Duration if we have startedAt
        const startTime = job.startedAt || now; // Fallback to now if missing (instant complete)
        const durationMinutes = differenceInMinutes(now, startTime);
        data.actualDurationMinutes = durationMinutes > 0 ? durationMinutes : 0;
    }

    // Update
    const updatedJob = await prisma.job.update({
        where: { id: jobId },
        data // { status, timestamps... }
    });

    // Determine paths to revalidate
    // Usually dashboard, calendar, or job details
    revalidatePath('/dashboard');
    revalidatePath(`/jobs/${jobId}`);

    return { success: true, job: updatedJob };
}
