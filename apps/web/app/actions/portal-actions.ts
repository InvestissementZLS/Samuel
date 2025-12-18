'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function signQuote(quoteId: string, signatureData: string) {
    try {
        if (!signatureData) {
            return { success: false, error: "No signature provided" };
        }

        const quote = await prisma.quote.update({
            where: { id: quoteId },
            data: {
                status: 'ACCEPTED',
                signature: signatureData,
                signedAt: new Date(),
            },
        });

        revalidatePath(`/portal/quotes/${quoteId}`);
        revalidatePath('/quotes');

        return { success: true, quote };
    } catch (error) {
        console.error("Error signing quote:", error);
        return { success: false, error: "Failed to sign quote" };
    }
}
