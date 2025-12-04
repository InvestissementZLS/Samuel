import { getCommissionSummary, getCommissionHistory } from "@/app/actions/commission-actions";
import { CommissionSummary } from "@/components/commissions/commission-summary";
import { CommissionHistory } from "@/components/commissions/commission-history";
import { prisma } from "@/lib/prisma";

// Mock auth for now - in real app use actual session
async function getCurrentUser() {
    // For MVP, we'll assume the first user with ADMIN or OFFICE role, or just check the first user
    // In a real scenario, this comes from the session
    return await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'OFFICE'] } }
    });
}

export default async function CommissionsPage() {
    const summary = await getCommissionSummary();
    const history = await getCommissionHistory();

    // TODO: Replace with real auth check
    // For now, we assume if you can access this page (protected by middleware later), you might have access
    // But we'll default to true for the "owner" experience requested
    const canManage = true;

    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Commission Dashboard</h1>

            <CommissionSummary summary={summary} canManage={canManage} />

            <CommissionHistory history={history} />
        </div>
    );
}
