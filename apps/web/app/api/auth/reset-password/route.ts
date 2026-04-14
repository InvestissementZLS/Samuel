import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, token, password } = body;

        if (!email || !token || !password) {
            return NextResponse.json(
                { error: "Tous les champs sont requis." },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "Le mot de passe doit contenir au moins 8 caractères." },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user || !user.resetToken || !user.resetTokenExpiry) {
            return NextResponse.json(
                { error: "Demande invalide ou expirée." },
                { status: 400 }
            );
        }

        // Check expiry
        if (new Date() > user.resetTokenExpiry) {
            return NextResponse.json(
                { error: "Le lien de réinitialisation a expiré." },
                { status: 400 }
            );
        }

        // Verify token
        const isValidToken = await bcrypt.compare(token, user.resetToken);
        if (!isValidToken) {
            return NextResponse.json(
                { error: "Jeton de réinitialisation invalide." },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Reset Password Error:", error);
        return NextResponse.json(
            { error: "Une erreur interne s'est produite." },
            { status: 500 }
        );
    }
}
