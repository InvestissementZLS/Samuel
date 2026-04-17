'use server';

import { prisma } from '@/lib/prisma';
import { JobStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { differenceInMinutes } from 'date-fns';
import { calculateCommissions } from './commission-actions';
import { ensureJobInvoiceFinalized } from './job-billing-actions';
import { sendInvoice } from './email-actions';

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

    // --- Automation Trigger ---
    if (status === 'COMPLETED') {
        try {
            console.log(`[Automation] Processing post-completion for job ${jobId}`);

            // 1. Ensure Invoice exists and is set to SENT
            const invoice = await ensureJobInvoiceFinalized(jobId);

            // 2. Calculate initial PENDING commissions
            await calculateCommissions(jobId);

            // 3. Send the Invoice Email to client
            if (invoice && invoice.id) {
                await sendInvoice(invoice.id);
            }

            console.log(`[Automation] Successfully completed flow for job ${jobId}`);
        } catch (autoError) {
            console.error("[Automation] Error in post-completion flow:", autoError);
            // We don't throw here to avoid blocking the status update itself, 
            // but the error is logged.
        }
    }

    // Determine paths to revalidate
    // Usually dashboard, calendar, or job details
    revalidatePath('/dashboard');
    revalidatePath(`/jobs/${jobId}`);

    return { success: true, job: updatedJob };
}

// Complete a job with a service report (notes + signatures)
export async function completeJobWithReport(
    jobId: string,
    data: {
        reportNotes?: string;
        internalNotes?: string;
        technicianSignature?: string;
        clientSignature?: string;
    }
) {
    if (!jobId) throw new Error("Job ID required");

    const now = new Date();

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Job not found");

    const startTime = job.startedAt || now;
    const durationMinutes = startTime ? Math.max(0, (now.getTime() - startTime.getTime()) / 60000) : 0;

    await prisma.job.update({
        where: { id: jobId },
        data: {
            status: 'COMPLETED',
            completedAt: now,
            actualDurationMinutes: Math.round(durationMinutes),
            reportNotes: data.reportNotes || undefined,
            internalNotes: data.internalNotes || undefined,
            technicianSignature: data.technicianSignature || undefined,
            clientSignature: data.clientSignature || undefined,
        }
    });

    // Post-completion automation
    try {
        const invoice = await ensureJobInvoiceFinalized(jobId);
        await calculateCommissions(jobId);
        if (invoice?.id) await sendInvoice(invoice.id);
    } catch (autoError) {
        console.error("[Automation] Error in completeJobWithReport flow:", autoError);
    }

    revalidatePath('/dashboard');
    revalidatePath(`/jobs/${jobId}`);

    return { success: true };
}

