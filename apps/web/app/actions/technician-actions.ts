'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createTechnician(data: {
    name: string;
    email: string;
    password?: string;
    internalHourlyRate?: number;
    commissionPercentageSales?: number;
    commissionPercentageSupervision?: number;
    canManageCommissions?: boolean;
    divisions?: ("EXTERMINATION" | "ENTREPRISES")[];
    isActive?: boolean;
}) {
    await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: data.password, // TODO: Hash this in production
            role: 'TECHNICIAN',
            internalHourlyRate: data.internalHourlyRate,
            commissionPercentageSales: data.commissionPercentageSales,
            commissionPercentageSupervision: data.commissionPercentageSupervision,
            canManageCommissions: data.canManageCommissions,
            divisions: data.divisions || ["EXTERMINATION"],
            isActive: data.isActive,
        },
    });
    revalidatePath('/technicians');
}

export async function updateTechnician(id: string, data: {
    name?: string;
    email?: string;
    internalHourlyRate?: number;
    commissionPercentageSales?: number;
    commissionPercentageSupervision?: number;
    canManageCommissions?: boolean;
    password?: string;
    divisions?: ("EXTERMINATION" | "ENTREPRISES")[];
    isActive?: boolean;
}) {
    const updateData: any = {
        name: data.name,
        email: data.email,
        internalHourlyRate: data.internalHourlyRate,
        commissionPercentageSales: data.commissionPercentageSales,
        commissionPercentageSupervision: data.commissionPercentageSupervision,
        canManageCommissions: data.canManageCommissions,
        divisions: data.divisions,
        isActive: data.isActive,
    };

    if (data.password) {
        updateData.password = data.password; // TODO: Hash this in production
    }

    await prisma.user.update({
        where: { id },
        data: updateData,
    });
    revalidatePath('/technicians');
}

export async function deleteTechnician(id: string) {
    // Check if technician has any assigned jobs
    const jobCount = await prisma.job.count({
        where: {
            technicians: {
                some: {
                    id: id
                }
            }
        }
    });

    if (jobCount > 0) {
        throw new Error(`Cannot delete technician. They are assigned to ${jobCount} job(s).`);
    }

    await prisma.user.delete({
        where: { id },
    });
    revalidatePath('/technicians');
}

export async function getTechnicians() {
    return await prisma.user.findMany({
        where: { role: 'TECHNICIAN' },
        orderBy: { name: 'asc' }
    });
}
