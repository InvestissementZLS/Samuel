"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getTimesheets() {
    return await prisma.timesheetEntry.findMany({
        include: {
            user: true,
        },
        orderBy: {
            startTime: 'desc',
        },
    });
}

export async function approveTimesheet(id: string) {
    await prisma.timesheetEntry.update({
        where: { id },
        data: { status: 'APPROVED' },
    });
    revalidatePath('/admin/timesheets');
}

export async function updateTimesheet(id: string, data: { startTime?: Date, endTime?: Date, duration?: number }) {
    await prisma.timesheetEntry.update({
        where: { id },
        data,
    });
    revalidatePath('/admin/timesheets');
}

export async function deleteTimesheet(id: string) {
    await prisma.timesheetEntry.delete({
        where: { id },
    });
    revalidatePath('/admin/timesheets');
}
