'use server';

import { prisma } from '@/lib/prisma';
import { Division } from '@prisma/client';

export async function getDivisionSettings() {
    return await prisma.divisionSettings.findMany({
        orderBy: {
            division: 'asc'
        }
    });
}

export async function upsertDivisionSetting(data: {
    division: Division;
    emailSenderName: string;
    emailSenderAddress: string;
    resendApiKey?: string;
}) {
    try {
        const result = await prisma.divisionSettings.upsert({
            where: {
                division: data.division
            },
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

        return { success: true, count: 1 }; // Return count to match client expectation pattern
    } catch (error) {
        console.error("Failed to upsert division setting:", error);
        return { success: false, error: "Failed to save settings" };
    }
}
