'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Division, Role, UserDivisionAccess } from '@prisma/client';

export async function createTechnician(data: {
    name: string;
    email: string;
    password?: string;
    internalHourlyRate?: number;
    commissionPercentageSales?: number;
    commissionPercentageSupervision?: number;
    canManageCommissions?: boolean;
    canViewReports?: boolean;
    canManageTimesheets?: boolean;
    canManageExpenses?: boolean;
    canManageUsers?: boolean;
    divisions?: ("EXTERMINATION" | "ENTREPRISES" | "RENOVATION")[];
    accesses?: Partial<UserDivisionAccess>[];
    isActive?: boolean;
}) {
    const user = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: data.password, // TODO: Hash this in production
            role: 'TECHNICIAN',
            internalHourlyRate: data.internalHourlyRate,
            commissionPercentageSales: data.commissionPercentageSales,
            commissionPercentageSupervision: data.commissionPercentageSupervision,
            commissionPercentageSupervision: data.commissionPercentageSupervision,
            canManageCommissions: data.canManageCommissions,
            canViewReports: data.canViewReports,
            canManageTimesheets: data.canManageTimesheets,
            canManageExpenses: data.canManageExpenses,
            canManageUsers: data.canManageUsers,
            divisions: data.divisions || ["EXTERMINATION"],
            isActive: data.isActive,
        },
    });

    if (data.accesses) {
        for (const access of data.accesses) {
            await prisma.userDivisionAccess.create({
                data: {
                    userId: user.id,
                    division: access.division!,
                    role: access.role || 'TECHNICIAN',
                    canViewReports: access.canViewReports || false,
                    canManageTimesheets: access.canManageTimesheets || false,
                    canManageExpenses: access.canManageExpenses || false,
                    canManageUsers: access.canManageUsers || false,
                    canManageCommissions: access.canManageCommissions || false,
                }
            });
        }
    }

    revalidatePath('/technicians');
}

export async function updateTechnician(id: string, data: {
    name?: string;
    email?: string;
    internalHourlyRate?: number;
    commissionPercentageSales?: number;
    commissionPercentageSupervision?: number;
    canManageCommissions?: boolean;
    canViewReports?: boolean;
    canManageTimesheets?: boolean;
    canManageExpenses?: boolean;
    canManageUsers?: boolean;
    password?: string;
    divisions?: ("EXTERMINATION" | "ENTREPRISES" | "RENOVATION")[];
    accesses?: Partial<UserDivisionAccess>[];
    isActive?: boolean;
}) {
    const updateData: any = {
        name: data.name,
        email: data.email,
        internalHourlyRate: data.internalHourlyRate,
        commissionPercentageSales: data.commissionPercentageSales,
        commissionPercentageSupervision: data.commissionPercentageSupervision,
        canManageCommissions: data.canManageCommissions,
        canViewReports: data.canViewReports,
        canManageTimesheets: data.canManageTimesheets,
        canManageExpenses: data.canManageExpenses,
        canManageUsers: data.canManageUsers,
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

    if (data.accesses) {
        // Delete all existing and recreate (simpler sync)
        await prisma.userDivisionAccess.deleteMany({
            where: { userId: id }
        });

        for (const access of data.accesses) {
            await prisma.userDivisionAccess.create({
                data: {
                    userId: id,
                    division: access.division!,
                    role: access.role || 'TECHNICIAN',
                    canViewReports: access.canViewReports || false,
                    canManageTimesheets: access.canManageTimesheets || false,
                    canManageExpenses: access.canManageExpenses || false,
                    canManageUsers: access.canManageUsers || false,
                    canManageCommissions: access.canManageCommissions || false,
                }
            });
        }
    }

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
        where: {
            OR: [
                { role: 'TECHNICIAN' },
                { role: 'OFFICE' },
                { role: 'ADMIN' }
            ]
        },
        include: {
            accesses: true
        },
        orderBy: { name: 'asc' }
    });
}
