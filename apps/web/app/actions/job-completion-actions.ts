'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { sendServiceReportEmail } from '@/lib/email';

export interface CompleteJobData {
    startedAt?: Date;
    completedAt?: Date;
    technicianSignature?: string;
    clientSignature?: string;
    reportNotes?: string;
    internalNotes?: string;
}

export async function startJob(jobId: string) {
    try {
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'IN_PROGRESS',
                startedAt: new Date(),
            }
        });
        revalidatePath(`/jobs/${jobId}`);
        return { success: true };
    } catch (error) {
        console.error("Error starting job:", error);
        return { success: false, error: "Failed to start job" };
    }
}

export async function completeJob(jobId: string, data: CompleteJobData) {
    try {
        console.log("Completing job:", jobId);

        // 1. Update Job
        const updatedJob = await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'COMPLETED',
                startedAt: data.startedAt,
                completedAt: data.completedAt || new Date(),
                technicianSignature: data.technicianSignature,
                clientSignature: data.clientSignature,
                reportNotes: data.reportNotes,
                internalNotes: data.internalNotes,
                // If we were generating a URL to store (e.g. S3), we'd save it here:
                // serviceReportUrl: ... 
            },
            include: {
                client: true,
                property: true,
                products: {
                    include: {
                        product: true
                    }
                },
                technicians: true
            }
        });

        // 2. Send Email
        console.log("Sending service report email to:", updatedJob.client.email);
        await sendServiceReportEmail(updatedJob);

        revalidatePath(`/jobs/${jobId}`);
        revalidatePath('/calendar');
        revalidatePath('/jobs');

        return { success: true };
    } catch (error) {
        console.error("Error completing job:", error);
        return { success: false, error: "Failed to complete job" };
    }
}
