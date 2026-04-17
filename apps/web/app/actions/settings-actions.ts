'use server';

import { prisma } from '@/lib/prisma';
import { Division } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function upsertDivisionSetting(data: {
    division: Division;
    emailSenderName: string;
    emailSenderAddress: string;
    resendApiKey?: string;
}) {
    try {
        await prisma.divisionSettings.upsert({
            where: { division: data.division },
            update: {
                emailSenderName: data.emailSenderName,
                emailSenderAddress: data.emailSenderAddress,
                resendApiKey: data.resendApiKey || null
            },
            create: {
                division: data.division,
                emailSenderName: data.emailSenderName,
                emailSenderAddress: data.emailSenderAddress,
                resendApiKey: data.resendApiKey || null
            }
        });
        revalidatePath('/settings'); // Assuming this page is /settings
        return { success: true };
    } catch (e: any) {
        console.error("Error upserting division settings:", e);
        return { success: false, error: e.message };
    }
}

export async function getDivisionSettings() {
    return prisma.divisionSettings.findMany();
}
