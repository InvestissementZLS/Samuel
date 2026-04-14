import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'zls-fallback-dev-secret-change-in-production-!!'
const secret = new TextEncoder().encode(JWT_SECRET)

async function isValidToken(token: string): Promise<boolean> {
    // Legacy UUID tokens (no dots) — still accept during migration period
    if (!token.includes('.')) return token.length > 10;

    // JWT — verify signature + expiry
    try {
        await jwtVerify(token, secret, { algorithms: ['HS256'] })
        return true
    } catch {
        return false
    }
}

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    // Public paths that don't require authentication
    const isPublicPath =
        path === '/login' ||
        path === '/forgot-password' ||
        path === '/reset-password' ||
        path.startsWith('/portal') ||
        path.startsWith('/legacy-portal') ||
        path.startsWith('/booking') ||
        path.startsWith('/feedback') ||
        path.startsWith('/_next') ||
        path.startsWith('/static') ||
        path.includes('favicon.ico') ||
        path === '/api/auth/login' ||
        path === '/api/auth/logout' ||
        path.startsWith('/api/auth/reset') ||
        path.startsWith('/api/auth/forgot') ||
        path === '/api/setup' ||
        path.startsWith('/api/setup/')

    const token = request.cookies.get('auth_token')?.value

    if (!isPublicPath) {
        const valid = token ? await isValidToken(token) : false
        if (!valid) {
            const response = NextResponse.redirect(new URL('/login', request.url))
            if (token) response.cookies.delete('auth_token') // Clear invalid/expired cookie
            return response
        }
    }

    // Avoid redirect loop: only bounce /login → / when token is actually valid
    if (path === '/login' && token && !request.nextUrl.searchParams.get('loggedOut')) {
        if (await isValidToken(token)) {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
