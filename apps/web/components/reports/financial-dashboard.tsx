"use client";

import { useState, useEffect } from "react";
import { getFinancialStats, getFinancialHistory, FinancialStats } from "@/app/actions/financial-actions";
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns";
import { TrendingUp, TrendingDown, DollarSign, PieChart, Activity } from "lucide-react";

export function FinancialDashboard() {
    const [period, setPeriod] = useState<'CURRENT_MONTH' | 'LAST_MONTH' | 'YTD'>('CURRENT_MONTH');
    const [stats, setStats] = useState<FinancialStats | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [period]);

    const loadData = async () => {
        setLoading(true);
        const now = new Date();
        let start = startOfMonth(now);
        let end = endOfMonth(now);

        if (period === 'LAST_MONTH') {
            start = startOfMonth(subMonths(now, 1));
            end = endOfMonth(subMonths(now, 1));
        } else if (period === 'YTD') {
            start = new Date(now.getFullYear(), 0, 1);
            end = now;
        }

        const [data, hist] = await Promise.all([
            getFinancialStats(start, end),
            getFinancialHistory()
        ]);

        setStats(data);
        setHistory(hist);
        setLoading(false);
    };

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Calculating Profitability...</div>;
    if (!stats) return <div className="p-8 text-center text-red-500">Error loading data</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Controls */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Profit & Loss Statement</h2>
                <div className="bg-white rounded-lg shadow-sm border p-1 flex space-x-1">
                    {(['CURRENT_MONTH', 'LAST_MONTH', 'YTD'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${period === p
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {p.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard
                    title="Revenue"
                    amount={stats.revenue}
                    icon={<DollarSign className="w-5 h-5 text-blue-600" />}
                    color="text-blue-600"
                />
                <KPICard
                    title="Gross Profit"
                    amount={stats.grossProfit}
                    subValue={`${stats.grossMargin.toFixed(1)}% Margin`}
                    icon={<Activity className="w-5 h-5 text-indigo-600" />}
                    color="text-indigo-600"
                />
                <KPICard
                    title="Expenses"
                    amount={stats.expenses.total}
                    icon={<TrendingDown className="w-5 h-5 text-orange-600" />}
                    color="text-orange-600"
                />
                <KPICard
                    title="Net Profit"
                    amount={stats.netProfit}
                    subValue={`${stats.netMargin.toFixed(1)}% Net Margin`}
                    icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
                    color={stats.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}
                    highlight
                />
            </div>

            {/* Detailed Breakdown Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* COGS Section */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gray-50/50 flex justify-between">
                        <h3 className="font-semibold text-gray-800">Job Costs (COGS)</h3>
                        <span className="text-sm font-medium text-gray-900">${stats.cogs.total.toLocaleString()}</span>
                    </div>
                    <div className="p-6 space-y-4">
                        <BarRow label="Materials" value={stats.cogs.material} total={stats.cogs.total} color="bg-blue-500" />
                        <BarRow label="Technician Labor" value={stats.cogs.labor} total={stats.cogs.total} color="bg-indigo-500" />

                        <div className="mt-6 pt-4 border-t text-sm text-gray-500">
                            <p>Direct costs associated with completing jobs.</p>
                        </div>
                    </div>
                </div>

                {/* Expenses Section */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gray-50/50 flex justify-between">
                        <h3 className="font-semibold text-gray-800">Operating Expenses</h3>
                        <span className="text-sm font-medium text-gray-900">${stats.expenses.total.toLocaleString()}</span>
                    </div>
                    <table className="w-full text-sm text-left">
                        <tbody className="divide-y divide-gray-100">
                            {stats.expenses.byCategory.map((req) => (
                                <tr key={req.category}>
                                    <td className="px-6 py-3 text-gray-600">{req.category}</td>
                                    <td className="px-6 py-3 text-right font-medium text-gray-900">
                                        ${req.amount.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {stats.expenses.byCategory.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="px-6 py-8 text-center text-gray-400">No expenses recorded for this period.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* History Chart (Mock Visual) */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-gray-800 mb-6">Profitability Trend (6 Months)</h3>
                <div className="h-48 flex items-end space-x-4">
                    {history.map((month) => {
                        const maxVal = Math.max(...history.map(h => h.revenue));
                        const revenueH = (month.revenue / maxVal) * 100;
                        const profitH = (month.netProfit / maxVal) * 100;

                        return (
                            <div key={month.month} className="flex-1 flex flex-col items-center gap-2 group relative">
                                <div className="w-full flex justify-center gap-1 h-full items-end">
                                    {/* Revenue Bar */}
                                    <div
                                        className="w-3 bg-gray-200 rounded-t-sm hover:bg-gray-300 transition-all"
                                        style={{ height: `${revenueH}%` }}
                                        title={`Revenue: $${month.revenue}`}
                                    />
                                    {/* Profit Bar */}
                                    <div
                                        className={`w-3 rounded-t-sm transition-all ${month.netProfit >= 0 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
                                        style={{ height: `${Math.abs(profitH)}%` }}
                                        title={`Net Profit: $${month.netProfit}`}
                                    />
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium uppercase">{month.month.split(' ')[0]}</span>
                            </div>
                        )
                    })}
                </div>
                <div className="mt-4 flex justify-center gap-6 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-200 rounded-sm"></div> Revenue
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Net Profit
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, amount, subValue, icon, color, highlight }: any) {
    return (
        <div className={`p-6 rounded-xl border shadow-sm ${highlight ? 'bg-gradient-to-br from-white to-emerald-50/50 border-emerald-100' : 'bg-white'}`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-gray-500">{title}</span>
                <div className={`p-2 rounded-lg bg-gray-50 ${color.replace('text-', 'bg-').replace('600', '100')}`}>
                    {icon}
                </div>
            </div>
            <div className="flex items-baseline gap-2">
                <h3 className={`text-2xl font-bold ${color}`}>${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            {subValue && (
                <p className="text-xs font-medium text-gray-400 mt-1">{subValue}</p>
            )}
        </div>
    );
}

function BarRow({ label, value, total, color }: any) {
    const safeTotal = total || 1;
    const percentage = Math.round((value / safeTotal) * 100);

    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{label}</span>
                <span className="font-medium text-gray-900">${value.toLocaleString()} ({percentage}%)</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
}
