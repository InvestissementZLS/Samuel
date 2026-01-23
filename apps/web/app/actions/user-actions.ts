"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function getUserProfile() {
    const cookieStore = cookies();
    const userId = cookieStore.get("auth_token")?.value;

    if (!userId) {
        return null;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                divisions: true,
                canManageDivisions: true,
                canViewReports: true,
                canManageTimesheets: true,
                canManageExpenses: true,
                canManageUsers: true,
                canManageCommissions: true,
                language: true,
                accesses: true
            }
        });
        return user;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}
