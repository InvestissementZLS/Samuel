"use client";

import { useState } from "react";
import { payUserCommissions } from "@/app/actions/commission-actions";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface CommissionSummaryProps {
    summary: {
        user: { id: string; name: string | null; email: string };
        totalAmount: number;
        count: number;
    }[];
    canManage: boolean;
}

export function CommissionSummary({ summary, canManage }: CommissionSummaryProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const handlePay = async (userId: string) => {
        if (!confirm("Are you sure you want to mark these commissions as PAID?")) return;
        setLoading(userId);
        try {
            await payUserCommissions(userId);
            toast.success("Commissions marked as paid");
        } catch (error) {
            console.error("Failed to pay commissions:", error);
            toast.error("Failed to update commissions");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Pending Balances</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Overview of commissions waiting to be paid.</p>
            </div>
            <div className="border-t border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Jobs</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {summary.map((item) => (
                            <tr key={item.user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {item.user.name || item.user.email}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.count}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                                    {formatCurrency(item.totalAmount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {canManage && (
                                        <button
                                            onClick={() => handlePay(item.user.id)}
                                            disabled={loading === item.user.id}
                                            className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                                        >
                                            {loading === item.user.id ? "Processing..." : "Mark as Paid"}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {summary.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-gray-500 italic">
                                    No pending commissions.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
