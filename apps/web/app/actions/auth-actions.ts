"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { sendPasswordResetEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Helper to get current user from cookie
async function getCurrentUser() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("auth_token")?.value;
    if (!userId) return null;
    return await prisma.user.findUnique({ where: { id: userId } });
}

export async function changePassword(current: string, newPass: string) {
    if (!current || !newPass) {
        return { success: false, message: "Both passwords are required" };
    }

    if (newPass.length < 8) {
        return { success: false, message: "New password must be at least 8 characters" };
    }

    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Not authenticated" };

    // Verify current password securely
    if (!user.password) {
        return { success: false, message: "No password set. Contact administrator." };
    }

    let currentPasswordValid = false;
    if (user.password.startsWith('$2')) {
        // Bcrypt hash
        currentPasswordValid = await bcrypt.compare(current, user.password);
    } else {
        // Legacy plaintext
        currentPasswordValid = user.password === current;
    }

    if (!currentPasswordValid) {
        return { success: false, message: "Incorrect current password" };
    }

    // Hash and save new password
    const hashed = await bcrypt.hash(newPass, 12);
    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed }
    });

    return { success: true };
}

export async function requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        // Return success even if user not found to prevent email enumeration attacks
        return { success: true, message: "If an account exists, a reset link has been sent." };
    }

    // Generate a cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');
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
    if (!token || !newPass) {
        return { success: false, message: "Token and password are required" };
    }

    if (newPass.length < 8) {
        return { success: false, message: "Password must be at least 8 characters" };
    }

    const user = await prisma.user.findFirst({
        where: {
            resetToken: token,
            resetTokenExpiry: { gt: new Date() }
        }
    });

    if (!user) {
        return { success: false, message: "Invalid or expired token" };
    }

    // Hash and save the new password
    const hashed = await bcrypt.hash(newPass, 12);
    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashed,
            resetToken: null,
            resetTokenExpiry: null
        }
    });

    return { success: true };
}
