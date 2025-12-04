'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getTreatmentOptions() {
    const locations = await prisma.treatmentLocation.findMany({ orderBy: { name: 'asc' } });
    const pests = await prisma.targetPest.findMany({ orderBy: { name: 'asc' } });
    const methods = await prisma.applicationMethod.findMany({ orderBy: { name: 'asc' } });

    return { locations, pests, methods };
}

export async function createTreatmentLocation(name: string) {
    try {
        const location = await prisma.treatmentLocation.create({ data: { name } });
        return { success: true, data: location };
    } catch (error) {
        return { success: false, error: "Failed to create location" };
    }
}

export async function createTargetPest(name: string) {
    try {
        const pest = await prisma.targetPest.create({ data: { name } });
        return { success: true, data: pest };
    } catch (error) {
        return { success: false, error: "Failed to create pest" };
    }
}

export async function createApplicationMethod(name: string) {
    try {
        const method = await prisma.applicationMethod.create({ data: { name } });
        return { success: true, data: method };
    } catch (error) {
        return { success: false, error: "Failed to create method" };
    }
}

export async function deleteTreatmentLocation(id: string) {
    await prisma.treatmentLocation.delete({ where: { id } });
}

export async function deleteTargetPest(id: string) {
    await prisma.targetPest.delete({ where: { id } });
}

export async function deleteApplicationMethod(id: string) {
    await prisma.applicationMethod.delete({ where: { id } });
}
