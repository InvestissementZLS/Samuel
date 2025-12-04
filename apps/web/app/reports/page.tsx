import { getDashboardStats } from "@/app/actions/reporting-actions";
import { DollarSign, Briefcase, CheckCircle, Calendar } from "lucide-react";

export default async function ReportsPage() {
    const stats = await getDashboardStats();

    return (
        <div className="p-6 space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Reporting Dashboard</h1>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Revenue"
                    value={`$${stats.totalRevenue.toLocaleString()}`}
                    icon={<DollarSign className="h-6 w-6 text-green-600" />}
                    color="bg-green-50"
                />
                <MetricCard
                    title="Total Jobs"
                    value={stats.totalJobs.toString()}
                    icon={<Briefcase className="h-6 w-6 text-blue-600" />}
                    color="bg-blue-50"
                />
                <MetricCard
                    title="Completed Jobs"
                    value={stats.completedJobs.toString()}
                    icon={<CheckCircle className="h-6 w-6 text-indigo-600" />}
                    color="bg-indigo-50"
                />
                <MetricCard
                    title="Scheduled Jobs"
                    value={stats.scheduledJobs.toString()}
                    icon={<Calendar className="h-6 w-6 text-orange-600" />}
                    color="bg-orange-50"
                />
            </div>

            {/* Revenue Chart */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Revenue by Month (Current Year)</h2>
                <div className="h-64 flex items-end gap-2">
                    {stats.revenueByMonth.map((data) => {
                        const maxRevenue = Math.max(...stats.revenueByMonth.map(d => d.amount), 1); // Avoid div by 0
                        const heightPercentage = (data.amount / maxRevenue) * 100;

                        return (
                            <div key={data.month} className="flex-1 flex flex-col items-center gap-2 group">
                                <div className="relative w-full flex items-end justify-center h-full">
                                    <div
                                        className="w-full bg-indigo-500 rounded-t-sm hover:bg-indigo-600 transition-all duration-300"
                                        style={{ height: `${heightPercentage}%` }}
                                    ></div>
                                    {/* Tooltip */}
                                    <div className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        ${data.amount.toLocaleString()}
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-gray-500">{data.month}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
    return (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex items-center gap-4">
            <div className={`p-3 rounded-full ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}
