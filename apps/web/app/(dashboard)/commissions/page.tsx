import { getCommissionSummary, getCommissionHistory } from "@/app/actions/commission-actions";
import { CommissionSummary } from "@/components/commissions/commission-summary";
import { CommissionHistory } from "@/components/commissions/commission-history";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";

async function getCurrentUser() {
    return await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'OFFICE'] } }
    });
}

export default async function CommissionsPage() {
    const summary = await getCommissionSummary();
    const history = await getCommissionHistory();
    const canManage = true;

    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <PageHeader pageKey="commissions" />
            <CommissionSummary summary={summary} canManage={canManage} />
            <CommissionHistory history={history} />
        </div>
    );
}
