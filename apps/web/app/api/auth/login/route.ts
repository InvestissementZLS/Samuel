import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        let user;
        try {
            user = await prisma.user.findUnique({
                where: { email },
            });
        } catch (dbError: any) {
            console.error("Login DB Error:", dbError);
            return NextResponse.json(
                { error: "Database service unavailable" },
                { status: 503 }
            );
        }

        if (!user) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        if (!user.isActive) {
            return NextResponse.json(
                { error: "Account is disabled. Contact an administrator." },
                { status: 403 }
            );
        }

        // Secure password verification using bcrypt
        // Supports legacy plaintext passwords by falling back if password doesn't look like a hash
        let passwordValid = false;
        if (user.password) {
            if (user.password.startsWith('$2')) {
                // It's a proper bcrypt hash - compare securely
                passwordValid = await bcrypt.compare(password, user.password);
            } else {
                // Legacy plaintext - compare and then upgrade to hash
                passwordValid = user.password === password;
                if (passwordValid) {
                    // Upgrade to bcrypt hash silently
                    const hashed = await bcrypt.hash(password, 12);
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { password: hashed }
                    });
                }
            }
        } else {
            // No password set - deny login (admin must set one)
            return NextResponse.json(
                { error: "Account not configured. Contact an administrator." },
                { status: 401 }
            );
        }

        if (!passwordValid) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Return user info (excluding password)
        const { password: _, ...userWithoutPassword } = user;
        const safeUser = JSON.parse(JSON.stringify(userWithoutPassword));

        const response = NextResponse.json(safeUser);

        // Cookie options
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        };

        response.cookies.set('auth_token', user.id, cookieOptions);
        // Non-httpOnly version for client-side legacy access
        response.cookies.set('userId', user.id, { ...cookieOptions, httpOnly: false });

        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
        );
    }
}
