import { NextResponse } from "next/server";

export async function POST() {
    try {
        const response = NextResponse.json({ success: true });

        // Clear cookies
        response.cookies.delete('auth_token');
        response.cookies.delete('userId');

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

    // Clear cookies
    response.cookies.delete('auth_token');
    response.cookies.delete('userId');

    return response;
}
