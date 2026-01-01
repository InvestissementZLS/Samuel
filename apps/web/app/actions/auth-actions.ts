"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { sendPasswordResetEmail } from "@/lib/email";

// Helper to get current user from cookie
async function getCurrentUser() {
    const cookieStore = cookies();
    const userId = cookieStore.get("auth_token")?.value;
    if (!userId) return null;
    return await prisma.user.findUnique({ where: { id: userId } });
}

export async function changePassword(current: string, newPass: string) {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Not authenticated" };

    // Verify current password
    // TODO: Use proper hashing comparison in production
    if (user.password && user.password !== current) {
        return { success: false, message: "Incorrect current password" };
    }

    // Update password
    // TODO: Hash new password in production
    await prisma.user.update({
        where: { id: user.id },
        data: { password: newPass }
    });

    return { success: true };
}

export async function requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        // Return success even if user not found to prevent enumeration
        return { success: true, message: "If an account exists, a reset link has been sent." };
    }

    // Generate token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
        where: { id: user.id },
        data: {
            resetToken: token,
            resetTokenExpiry: expiry
        }
    });

    // Send email
    await sendPasswordResetEmail(email, token);

    return { success: true, message: "If an account exists, a reset link has been sent." };
}

export async function resetPassword(token: string, newPass: string) {
    const user = await prisma.user.findFirst({
        where: {
            resetToken: token,
            resetTokenExpiry: { gt: new Date() }
        }
    });

    if (!user) {
        return { success: false, message: "Invalid or expired token" };
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: newPass, // TODO: Hash
            resetToken: null,
            resetTokenExpiry: null
        }
    });

    return { success: true };
}
