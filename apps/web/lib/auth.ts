import { cookies, headers } from 'next/headers';
import { prisma } from './prisma';

/**
 * Validates auth from either:
 * 1. Cookie `auth_token` (web dashboard)
 * 2. `Authorization: Bearer <userId>` header (mobile app)
 *
 * Usage in API routes:
 * ```
 * const user = await validateAuth(request);
 * if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * ```
 */
export async function validateAuth(request?: Request) {
    try {
        let userId: string | undefined;

        // 1. Try Authorization Bearer header first (mobile app)
        if (request) {
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                userId = authHeader.substring(7).trim();
            }
        }

        // 2. Fall back to cookie (web dashboard)
        if (!userId) {
            const cookieStore = await cookies();
            userId = cookieStore.get('auth_token')?.value;
        }

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

