'use client';

import { useState } from 'react';
import { Invoice, InvoiceItem, Product } from '@prisma/client';
import { removeBillableService } from '@/app/actions/job-billing-actions';
import { toast } from 'sonner';
import { Trash2, FileText, Plus } from 'lucide-react';
import { BillableServiceDialog } from './billable-service-dialog';
import { format } from 'date-fns';

interface JobBillingProps {
    jobId: string;
    invoices: (Invoice & { items: (InvoiceItem & { product: Product })[] })[];
    availableServices: Product[];
}

export function JobBilling({ jobId, invoices, availableServices }: JobBillingProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleRemove = async (itemId: string) => {
        if (!confirm("Remove this service from invoice?")) return;
        const res = await removeBillableService(itemId, jobId);
        if (res.success) {
            toast.success("Service removed");
        } else {
            toast.error("Failed to remove service");
        }
    };

    // Filter to show primarily DRAFT invoices for editing, but list others for reference?
    // User goal: "Section Facturation" where tech selects services.
    // We should focus on the active Draft invoice.
    const draftInvoice = invoices.find(inv => inv.status === 'DRAFT');
    const otherInvoices = invoices.filter(inv => inv.status !== 'DRAFT');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-500" />
                    Billing & Services
                </h3>
                <button
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Service
                </button>
            </div>

            <BillableServiceDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                jobId={jobId}
                availableServices={availableServices}
            />

            {/* Active Draft Invoice */}
            <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Current Invoice (Draft)</span>
                    <span className="text-sm text-gray-500">
                        {draftInvoice ? draftInvoice.number : 'No draft invoice'}
                    </span>
                </div>

                {draftInvoice?.items && draftInvoice.items.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {draftInvoice.items.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                        {item.product.name}
                                        {item.description && item.description !== item.product.name && (
                                            <div className="text-gray-500 text-xs font-normal">{item.description}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.quantity}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">${item.price.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                        ${(item.quantity * item.price).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleRemove(item.id)}
                                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                                            title="Remove"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-gray-50">
                                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                                    Total
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                                    ${draftInvoice.total.toFixed(2)}
                                </td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                ) : (
                    <div className="p-8 text-center text-gray-500 italic">
                        No services added yet. Click "Add Service" to begin billing.
                    </div>
                )}
            </div>

            {/* Previous Invoices (ReadOnly) */}
            {otherInvoices.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Previous Invoices</h4>
                    {otherInvoices.map(inv => (
                        <div key={inv.id} className="bg-gray-50 border rounded p-3 flex justify-between items-center text-sm">
                            <div className="flex gap-4">
                                <span className="font-medium text-gray-900">{inv.number}</span>
                                <span className="text-gray-500">{format(new Date(inv.issuedDate), "MMM d, yyyy")}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                                    ${inv.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {inv.status}
                                </span>
                            </div>
                            <span className="font-bold text-gray-900">${inv.total.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
