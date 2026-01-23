import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
        } catch (dbError) {
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

        // TODO: Implement real password hashing comparison
        // For now, we'll just check if the password matches the stored string (if any)
        // or just allow login if the user exists for the MVP phase as per plan
        if (user.password && user.password !== password) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Return user info (excluding password)
        const { password: _, ...userWithoutPassword } = user;

        // Serialize Date objects to strings for Client Component compatibility
        const safeUser = JSON.parse(JSON.stringify(userWithoutPassword));

        const response = NextResponse.json(safeUser);

        // Set a simple auth cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        };

        response.cookies.set('auth_token', user.id, cookieOptions);
        response.cookies.set('userId', user.id, { ...cookieOptions, httpOnly: false }); // Allow client access for userId if needed by legacy stats

        return response;
    } catch (error) {
        console.error("Login parsing error:", error);
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
        );
    }
}

