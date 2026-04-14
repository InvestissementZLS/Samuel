import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { sendPasswordResetEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { error: "L'adresse courriel est requise." },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            // Security best practice: Do not reveal if the email exists or not.
            return NextResponse.json({ success: true });
        }

        if (!user.isActive) {
            return NextResponse.json(
                { error: "Ce compte est désactivé." },
                { status: 403 }
            );
        }

        // Generate a secure token
        const rawToken = uuidv4();
        // Hash it for DB storage (security best practice to prevent token leaks on DB compromise)
        const hashedToken = await bcrypt.hash(rawToken, 10);
        
        // Expiry in 1 hour
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 1);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: hashedToken,
                resetTokenExpiry: expiryDate
            }
        });

        // Use the first available division assigned to the user for email config, fallback to EXTERMINATION
        const currentDivision = (user.divisions && user.divisions.length > 0) ? user.divisions[0] : "EXTERMINATION";

        // Send Email
        const emailResult = await sendPasswordResetEmail(user.email, rawToken, currentDivision);

        if (!emailResult.success) {
            console.error("Failed to send reset email:", emailResult.error);
            return NextResponse.json(
                { error: "Erreur lors de l'envoi du courriel. Veuillez réessayer plus tard." },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        return NextResponse.json(
            { error: "Une erreur interne s'est produite." },
            { status: 500 }
        );
    }
}
