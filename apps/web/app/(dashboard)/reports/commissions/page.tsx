import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export const dynamic = 'force-dynamic';

export default async function CommissionReportPage() {
    const jobs = await prisma.job.findMany({
        where: {
            commissions: {
                some: {} // Only jobs with commissions
            }
        },
        include: {
            property: {
                include: {
                    client: true
                }
            },
            invoices: {
                include: {
                    items: true
                }
            },
            commissions: {
                include: {
                    user: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Commission Report</h1>

            <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job / Client</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Total</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Upsell Amount</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Commissions</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {jobs.map((job) => {
                            // Calculate metrics
                            const invoiceTotal = job.invoices.reduce((sum, inv) => sum + inv.total, 0);

                            // Upsell Amount (from Paid Invoices for accuracy, or all invoices?)
                            // Let's us all invoices linked to job
                            const upsellTotal = job.invoices.reduce((sum, inv) => {
                                // @ts-ignore
                                const upsells = inv.items.filter((item: any) => item.isUpsell);
                                return sum + upsells.reduce((iSum: number, item: any) => iSum + (item.quantity * item.price), 0);
                            }, 0);

                            const totalCommission = job.commissions.reduce((sum, c) => sum + c.amount, 0);

                            // Group commissions by User
                            const commsByUser = job.commissions.reduce((acc, c) => {
                                const name = c.user.name || c.user.email;
                                if (!acc[name]) acc[name] = 0;
                                acc[name] += c.amount;
                                return acc;
                            }, {} as Record<string, number>);

                            return (
                                <tr key={job.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{job.property.client.name}</div>
                                        <div className="text-sm text-gray-500">{job.property.address}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(job.scheduledAt, "MMM d, yyyy")}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                        ${invoiceTotal.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                                        ${upsellTotal.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right text-gray-500">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="font-bold text-gray-900">${totalCommission.toFixed(2)}</span>
                                            {Object.entries(commsByUser).map(([name, amount]) => (
                                                <span key={name} className="text-xs text-gray-400">
                                                    {name}: ${amount.toFixed(2)}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {job.commissions.every(c => c.status === 'PAID') ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                Paid
                                            </span>
                                        ) : job.commissions.some(c => c.status === 'APPROVED') ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                Approved
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                Pending
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {jobs.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                                    No commission records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
