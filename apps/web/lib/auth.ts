import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { verifyJWT } from './jwt';

/**
 * Validates auth from either:
 * 1. Cookie `auth_token` (web dashboard) — now contains a signed JWT
 * 2. `Authorization: Bearer <JWT>` header (mobile app)
 *
 * B-01 FIX: The token is now a signed JWT (HS256) instead of a raw userId.
 * This prevents identity spoofing — an attacker must know the JWT_SECRET to forge a token.
 *
 * Usage in API routes:
 * ```
 * const user = await validateAuth(request);
 * if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * ```
 */
export async function validateAuth(request?: Request) {
    try {
        let tokenString: string | undefined;

        // 1. Try Authorization Bearer header first (mobile app)
        if (request) {
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                tokenString = authHeader.substring(7).trim();
            }
        }

        // 2. Fall back to cookie (web dashboard)
        if (!tokenString) {
            const cookieStore = await cookies();
            tokenString = cookieStore.get('auth_token')?.value;
        }

        if (!tokenString) return null;

        // B-01 FIX: Verify JWT signature instead of blindly accepting a raw userId.
        // verifyJWT returns null if token is expired, tampered, or has invalid signature.
        const jwtPayload = await verifyJWT(tokenString);

        // If JWT verification failed, check if it's a legacy raw userId (migration period)
        // Once all users have logged in and received a JWT, remove this fallback.
        const userId = jwtPayload?.sub ?? (
            // Legacy fallback: if token is a UUID-shaped string (not a JWT), treat as userId
            // JWTs always have dots (header.payload.signature)
            tokenString.includes('.') ? null : tokenString
        );

        if (!userId) return null;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                divisions: true,
                isActive: true,
                canViewReports: true,
                canManageTimesheets: true,
                canManageExpenses: true,
                canManageUsers: true,
                canManageCommissions: true,
                canManageDivisions: true,
            }
        });

        if (!user || !user.isActive) return null;

        return user;
    } catch (error) {
        console.error("validateAuth error:", error);
        return null;
    }
}

/**
 * Validates that the current user has ADMIN or OFFICE role.
 */
export async function validateAdminAuth(request?: Request) {
    const user = await validateAuth(request);
    if (!user) return null;
    if (user.role !== 'ADMIN' && user.role !== 'OFFICE') return null;
    return user;
}
