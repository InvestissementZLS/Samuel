import { FinancialDashboard } from "@/components/reports/financial-dashboard";
const PageHeader = ({ ...args }: any) => null;

export default function ReportsPage() {
    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            <PageHeader pageKey="reports" subtitleKey="subtitle" />
            <FinancialDashboard />
        </div>
    );
}
