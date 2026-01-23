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

        if (!user) return null;

        // Serialize Date objects to strings for Client Component compatibility
        return JSON.parse(JSON.stringify(user));
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

export async function updateUserLanguage(language: "EN" | "FR") {
    const user = await getUserProfile();
    if (!user) return { success: false, error: "Not authenticated" };

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: { language }
        });

        // Revalidate to update UI immediately
        // revalidatePath('/'); // Global revalidate might be too aggressive?
        // Let's just return success and let client update state via provider if needed.
        // Or revalidate layout?

        return { success: true };
    } catch (error) {
        console.error("Failed to update language:", error);
        return { success: false, error: "Update failed" };
    }
}
