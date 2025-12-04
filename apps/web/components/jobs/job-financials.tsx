'use client';

import { Job } from '@prisma/client';
import { calculateJobCosts } from '@/app/actions/cost-actions';
import { calculateCommissions } from '@/app/actions/commission-actions';
import { useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, DollarSign, TrendingUp, Users } from 'lucide-react';

interface JobFinancialsProps {
    job: Job;
}

export function JobFinancials({ job }: JobFinancialsProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleRecalculate = async () => {
        setIsLoading(true);
        try {
            const result = await calculateJobCosts(job.id);
            if (result.success) {
                toast.success("Costs recalculated");
                // Also trigger commission calculation if completed/paid?
                // For now, just costs.
            } else {
                toast.error("Failed to recalculate costs");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
    };

    const formatPercent = (percent: number) => {
        return `${percent.toFixed(1)}%`;
    };

    return (
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Financials
                </h2>
                <button
                    onClick={handleRecalculate}
                    disabled={isLoading}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Recalculate
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-medium">Revenue (Net)</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(job.netSellingPrice)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-medium">Total Cost</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(job.totalJobCost)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-medium">Profit</p>
                    <p className={`text-xl font-bold ${job.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(job.totalProfit)}
                    </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-medium">Margin</p>
                    <p className={`text-xl font-bold ${job.grossMarginPercentage >= 30 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {formatPercent(job.grossMarginPercentage)}
                    </p>
                </div>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Material Cost</span>
                    <span className="font-medium">{formatCurrency(job.totalMaterialCost)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Labor Cost</span>
                    <span className="font-medium">{formatCurrency(job.totalLaborCost)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Other Costs</span>
                    <span className="font-medium">{formatCurrency(job.otherDirectCosts)}</span>
                </div>
            </div>
        </div>
    );
}
