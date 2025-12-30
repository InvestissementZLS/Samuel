'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateUserLanguage(userId: string, language: 'EN' | 'FR') {
    await prisma.user.update({
        where: { id: userId },
        data: { language },
    });
    revalidatePath('/settings');
}
