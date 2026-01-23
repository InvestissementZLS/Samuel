"use client";

import { Division, Role, Language, UserDivisionAccess } from "@prisma/client";
import { useDivision } from "@/components/providers/division-provider";

// Define a type that matches the return of getUserProfile (or strict subset)
// We replicate the schema types manually/partially to avoid dragging in big dependencies if not needed,
// but sharing @prisma/client types is safest.

interface UserProfile {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    divisions: Division[];
    canManageDivisions: boolean;
    canViewReports: boolean;
    canManageTimesheets: boolean;
    canManageExpenses: boolean;
    canManageUsers: boolean;
    canManageCommissions: boolean;
    language: Language;
    accesses: UserDivisionAccess[];
}

interface PermissionCheck {
    canViewReports: boolean;
    canManageTimesheets: boolean;
    canManageExpenses: boolean;
    canManageUsers: boolean;
    canManageCommissions: boolean;
    hasDivisionAccess: boolean;
}

import { useUser } from "@/components/providers/user-provider";

export function useCurrentUser() {
    const { user } = useUser();
    // @ts-ignore - mismatch between Prisma User and local UserProfile interface, but runtime shape is compatible
    const userProfile: UserProfile | null = user;
    const loading = false;
    const { division } = useDivision();

    // No effect needed as data comes from context

    const checkPermission = (targetDivision?: Division): PermissionCheck => {
        const divToCheck = targetDivision || division;

        // Default deny if no user
        if (!userProfile) return {
            canViewReports: false,
            canManageTimesheets: false,
            canManageExpenses: false,
            canManageUsers: false,
            canManageCommissions: false,
            hasDivisionAccess: false
        };

        // Master Override
        if (userProfile.canManageDivisions) return {
            canViewReports: true,
            canManageTimesheets: true,
            canManageExpenses: true,
            canManageUsers: true,
            canManageCommissions: true,
            hasDivisionAccess: true
        };

        // Check specific division access
        const access = userProfile.accesses?.find(a => a.division === divToCheck);

        if (!access) return {
            canViewReports: false,
            canManageTimesheets: false,
            canManageExpenses: false,
            canManageUsers: false,
            canManageCommissions: false,
            hasDivisionAccess: false
        };

        return {
            canViewReports: access.canViewReports,
            canManageTimesheets: access.canManageTimesheets,
            canManageExpenses: access.canManageExpenses,
            canManageUsers: access.canManageUsers,
            canManageCommissions: access.canManageCommissions,
            hasDivisionAccess: true
        };
    };

    return { user: userProfile, loading, checkPermission };
}
