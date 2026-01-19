import { FinancialDashboard } from "@/components/reports/financial-dashboard";

export default function ReportsPage() {
    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Performance</h1>
            <p className="text-gray-500 mb-8">Track your revenue, job costs, and operating expenses to maximize profitability.</p>

            <FinancialDashboard />
        </div>
    );
}

