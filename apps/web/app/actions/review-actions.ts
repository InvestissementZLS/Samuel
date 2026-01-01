'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createReviewRequest(jobId: string) {
    // @ts-ignore
    const existing = await prisma.reviewRequest.findUnique({ where: { jobId } });
    if (existing) return existing;

    // @ts-ignore
    return await prisma.reviewRequest.create({
        data: { jobId }
    });
}

export async function getReviewRequest(token: string) {
    // @ts-ignore
    return await prisma.reviewRequest.findUnique({
        where: { token },
        include: { job: { include: { client: true } } }
    });
}

export async function submitInternalFeedback(token: string, score: number, feedback: string) {
    // @ts-ignore
    await prisma.reviewRequest.update({
        where: { token },
        data: {
            score,
            feedback,
            status: 'SUBMITTED_INTERNAL'
        }
    });
}

export async function markRedirectedToGoogle(token: string) {
    // @ts-ignore
    await prisma.reviewRequest.update({
        where: { token },
        data: {
            score: 5,
            status: 'REDIRECTED_GOOGLE'
        }
    });
}
