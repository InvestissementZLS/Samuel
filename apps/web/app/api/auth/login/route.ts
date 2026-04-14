import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signJWT } from "@/lib/jwt";
import { loginRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // Rate limiting: 5 attempts per 15 minutes per IP + email
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
        const rateLimitKey = `${ip}:${(email || '').toLowerCase()}`;
        const rateResult = loginRateLimiter.check(rateLimitKey);

        if (!rateResult.allowed) {
            const retryAfterSec = Math.ceil(rateResult.resetIn / 1000);
            return NextResponse.json(
                { error: `Trop de tentatives. Réessayez dans ${Math.ceil(retryAfterSec / 60)} minute(s).` },
                {
                    status: 429,
                    headers: { 'Retry-After': String(retryAfterSec) }
                }
            );
        }

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

        // B-01 FIX: Sign a proper JWT token for mobile authentication.
        // The JWT contains userId (sub), email, role — signed with HS256 / 7 days expiry.
        const token = await signJWT({
            sub: user.id,
            email: user.email,
            role: user.role,
            name: user.name ?? undefined,
            divisions: user.divisions ?? [],
        });

        // Return user info (excluding password) + signed JWT token for mobile
        const { password: _, ...userWithoutPassword } = user;
        const safeUser = JSON.parse(JSON.stringify(userWithoutPassword));

        // Include token in JSON body — mobile app stores this in AsyncStorage
        const response = NextResponse.json({
            ...safeUser,
            token,
        });

        // Cookie options for web dashboard (httpOnly, secure in prod)
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        };

        // Store the signed JWT in the auth_token cookie (replaces raw userId)
        response.cookies.set('auth_token', token, cookieOptions);
        // Non-httpOnly userId cookie for legacy client-side access
        response.cookies.set('userId', user.id, { ...cookieOptions, httpOnly: false });

        // Reset rate limiter on successful login
        loginRateLimiter.reset(rateLimitKey);

        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
        );
    }
}
