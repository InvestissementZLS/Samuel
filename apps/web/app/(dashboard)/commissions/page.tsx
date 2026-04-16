import { getCommissionSummary, getCommissionHistory } from "@/app/actions/commission-actions";
import { CommissionSummary } from "@/components/commissions/commission-summary";
import { CommissionHistory } from "@/components/commissions/commission-history";
const PageHeader = ({...args}: any) => null;
import { prisma } from "@/lib/prisma";

import { getUserProfile } from "@/app/actions/user-actions";

export default async function CommissionsPage() {
    const user = await getUserProfile();
    const canManage = user ? (user.role === 'ADMIN' || user.canManageCommissions) : false;
    
    // Si l'utilisateur NE PEUT PAS gérer, on force à voir seulement SES propres commissions
    const filterUserId = canManage ? undefined : user?.id;

    const summary = await getCommissionSummary(filterUserId);
    const history = await getCommissionHistory(filterUserId);

    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <PageHeader pageKey="commissions" />
            <CommissionSummary summary={summary} canManage={canManage} />
            <CommissionHistory history={history} />
        </div>
    );
}
