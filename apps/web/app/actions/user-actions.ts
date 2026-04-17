"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";

export async function getUserProfile() {
    const cookieStore = await cookies();
    const tokenString = cookieStore.get("auth_token")?.value;

    if (!tokenString) return null;

    try {
        // B-01: token is now a signed JWT — decode it to get userId
        const jwtPayload = await verifyJWT(tokenString);

        // Legacy fallback: if token is a plain UUID (pre-JWT migration), use directly
        const userId = jwtPayload?.sub ?? (
            tokenString.includes('.') ? null : tokenString
        );

        if (!userId) return null;

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

        return JSON.parse(JSON.stringify(user));
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

export async function updateUserLanguage(userId: string, language: "EN" | "FR") {
    // Basic verification: user must be logged in to do this
    const currentUser = await getUserProfile();
    if (!currentUser) return { success: false, error: "Not authenticated" };

    try {
        await prisma.user.update({
            where: { id: userId },
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

export async function setDivisionCookieAction(division: string) {
    const cookieStore = await cookies();
    cookieStore.set("division", division, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
    });
}
