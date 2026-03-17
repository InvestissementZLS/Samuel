import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    // Public paths that don't require authentication
    const isPublicPath =
        path === '/login' ||
        path.startsWith('/portal') ||
        path.startsWith('/legacy-portal') ||
        path.startsWith('/booking') ||
        path.startsWith('/feedback') ||
        path.startsWith('/_next') ||
        path.startsWith('/static') ||
        path.includes('favicon.ico') ||
        // Allow specific public API routes
        path === '/api/auth/login' ||
        path === '/api/auth/logout' ||
        path.startsWith('/api/auth/reset') ||
        path.startsWith('/api/dev/')

    const token = request.cookies.get('auth_token')?.value

    if (!isPublicPath && !token) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (path === '/login' && token && !request.nextUrl.searchParams.get('loggedOut')) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
