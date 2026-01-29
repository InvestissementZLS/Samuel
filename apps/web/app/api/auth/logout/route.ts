import { NextResponse } from "next/server";

export async function POST() {
    try {
        const response = NextResponse.json({ success: true });

        // Clear cookies with explicit options
        const cookieOptions = {
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            maxAge: 0,
        };

        response.cookies.set('auth_token', '', cookieOptions);
        response.cookies.set('userId', '', { ...cookieOptions, httpOnly: false });

        return response;
    } catch (error) {
        console.error("Logout error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    const response = NextResponse.redirect(new URL('/login', request.url));

    // Clear cookies with explicit options to ensure deletion
    // We must match the options used during creation (Path=/, Secure, etc.)
    const cookieOptions = {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 0,
    };

    response.cookies.set('auth_token', '', cookieOptions);
    response.cookies.set('userId', '', { ...cookieOptions, httpOnly: false });

    return response;
}
