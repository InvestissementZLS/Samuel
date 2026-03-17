import { cookies } from 'next/headers';
import { prisma } from './prisma';

/**
 * Validates the auth_token cookie and returns the current user.
 * Returns null if the user is not authenticated.
 * 
 * Usage in API routes:
 * ```
 * const user = await validateAuth();
 * if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * ```
 */
export async function validateAuth() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) return null;

        // The token is the user ID for now
        const user = await prisma.user.findUnique({
            where: { id: token },
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
 * Returns null if the user is not an admin.
 */
export async function validateAdminAuth() {
    const user = await validateAuth();
    if (!user) return null;
    if (user.role !== 'ADMIN' && user.role !== 'OFFICE') return null;
    return user;
}
