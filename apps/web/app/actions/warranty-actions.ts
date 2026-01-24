'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getWarrantyTemplates() {
    // @ts-ignore
    return await prisma.warrantyTemplate.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function createWarrantyTemplate(name: string, text: string, division?: "EXTERMINATION" | "ENTREPRISES" | "RENOVATION") {
    // @ts-ignore
    const warranty = await prisma.warrantyTemplate.create({
        data: {
            name,
            text,
            // @ts-ignore 
            division: division || "EXTERMINATION"
        }
    });
    revalidatePath('/settings/warranties');
    return warranty;
}

export async function updateWarrantyTemplate(id: string, name: string, text: string, division?: "EXTERMINATION" | "ENTREPRISES" | "RENOVATION") {
    // @ts-ignore
    const warranty = await prisma.warrantyTemplate.update({
        where: { id },
        data: {
            name,
            text,
            // @ts-ignore
            division
        }
    });
    revalidatePath('/settings/warranties');
    return warranty;
}

export async function deleteWarrantyTemplate(id: string) {
    // @ts-ignore
    await prisma.warrantyTemplate.delete({
        where: { id }
    });
    revalidatePath('/settings/warranties');
}
