"use client";

import { useState, useEffect } from "react";
import { Invoice, Product, Client } from "@prisma/client";
import { createInvoice, updateInvoiceStatus, updateInvoice, deleteInvoice } from "@/app/actions/client-portal-actions";
import { createCheckoutSession } from "@/app/actions/payment-actions";
import { format } from "date-fns";
import { toast } from "sonner";
import { FileText, Filter, Trash2, CheckCircle, DollarSign, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { PaymentDialog } from "@/components/invoices/payment-dialog";
import { DownloadPdfButton } from "@/components/invoices/download-pdf-button";
import { useDivision } from "@/components/providers/division-provider";
import Link from "next/link";


import { useLanguage } from "@/components/providers/language-provider";

interface InvoiceListProps {
    invoices: (Invoice & { items: (any & { product: Product })[], client: Client })[];
    products: Product[];
    clients?: Client[];
    clientId?: string; // Optional, if provided, restricts creation to this client
}

export function InvoiceList({ invoices, products, clientId, clients = [] }: InvoiceListProps) {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const { division } = useDivision();
    const [divisionFilter, setDivisionFilter] = useState<"ALL" | "EXTERMINATION" | "ENTREPRISES" | "RENOVATION">(division);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentModalType, setPaymentModalType] = useState<"PAYMENT" | "REFUND">("PAYMENT");
    const [paymentInvoice, setPaymentInvoice] = useState<any>(null);


    useEffect(() => {
        setDivisionFilter(division);
    }, [division]);

    const handleCreateNew = () => {
        // Allow creation without clientId now
        setSelectedInvoice(null);
        setIsEditing(true);
    };

    const handleEdit = (invoice: any) => {
        setSelectedInvoice(invoice);
        setIsEditing(true);
    };

    const handleSave = async (data: any) => {
        try {
            if (data.id) {
                await updateInvoice(data);
                toast.success(t.invoices.updated);
            } else {
                await createInvoice(data);
                toast.success(t.invoices.created);
            }
            setIsEditing(false);
        } catch (error) {
            toast.error(t.invoices.failedSave);
            console.error(error);
        }
    };

    const openPaymentModal = (invoice: any, type: "PAYMENT" | "REFUND") => {
        setPaymentInvoice(invoice);
        setPaymentModalType(type);
        setPaymentModalOpen(true);
    };


    const filteredInvoices = invoices.filter(inv => {
        if (divisionFilter === "ALL") return true;
        // @ts-ignore
        return inv.division === divisionFilter;
    });

    if (isEditing) {
        return (
            <div>
                <Button variant="ghost" onClick={() => setIsEditing(false)} className="mb-4">
                    &larr; {t.invoices.backToInvoices}
                </Button>
                <InvoiceForm
                    invoice={selectedInvoice}
                    products={products}
                    clients={clients}
                    clientId={selectedInvoice?.clientId || clientId || ""}
                    onSave={handleSave}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{t.invoices.title} ({filteredInvoices.length})</h3>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3 py-1.5">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={divisionFilter}
                            onChange={(e) => setDivisionFilter(e.target.value as any)}
                            className="border-none text-sm focus:ring-0 cursor-pointer text-gray-900 bg-white"
                        >
                            <option value="ALL">{t.common.allDivisions}</option>
                            <option value="EXTERMINATION">{t.divisions.extermination}</option>
                            <option value="ENTREPRISES">{t.divisions.entreprises}</option>
                            <option value="RENOVATION">{t.divisions.renovation}</option>
                        </select>
                    </div>

                    <Button onClick={handleCreateNew}>
                        + {t.invoices.createInvoice}
                    </Button>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <div className="divide-y divide-gray-200">
                    {filteredInvoices.map((invoice) => (
                        <div key={invoice.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-indigo-50 rounded text-indigo-600">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900">
                                                {/* @ts-ignore */}
                                                {invoice.number || (invoice.poNumber ? `PO #${invoice.poNumber}` : t.invoices.createInvoice)}
                                            </p>
                                            {!clientId && (
                                                <Link href={`/clients/${invoice.clientId}`} className="text-xs text-indigo-600 hover:underline">
                                                    ({invoice.client.name})
                                                </Link>
                                            )}
                                        </div>
                                        <div className="flex gap-2 text-sm text-gray-500">
                                            <span>{format(new Date(invoice.createdAt), "MMM d, yyyy")}</span>
                                            <span>•</span>
                                            <span>${invoice.total.toFixed(2)}</span>
                                            {/* @ts-ignore */}
                                            {invoice.division && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-xs uppercase tracking-wider font-semibold">
                                                        {/* @ts-ignore */}
                                                        {invoice.division === "EXTERMINATION" ? "EXO" : invoice.division === "RENOVATION" ? "REN" : "ENT"}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                        ${invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                            invoice.status === 'PARTIALLY_PAID' ? 'bg-orange-100 text-orange-800' :
                                                invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                                                    invoice.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                        {/* @ts-ignore */}
                                        {t.invoices.statuses[invoice.status] || invoice.status}
                                    </span>
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(invoice)}>
                                        {t.common.edit}
                                    </Button>
                                    <div className="flex gap-1">
                                        <DownloadPdfButton invoice={invoice} />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={async () => {
                                                const toastId = toast.loading(t.invoices.sending);
                                                try {
                                                    const { sendInvoice } = await import("@/app/actions/email-actions");
                                                    const result = await sendInvoice(invoice.id);
                                                    if (result.success) {
                                                        toast.success(t.invoices.emailSent, { id: toastId });
                                                    } else {
                                                        toast.error(t.invoices.emailError + ": " + (result.error || "Unknown error"), { id: toastId });
                                                    }
                                                } catch (error) {
                                                    toast.error(t.invoices.emailError, { id: toastId });
                                                }
                                            }}
                                        >
                                            {t.invoices.sendEmail}
                                        </Button>
                                    </div>

                                    {invoice.status !== 'PAID' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openPaymentModal(invoice, "PAYMENT")}
                                            className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                        >
                                            <DollarSign className="w-4 h-4 mr-1" />
                                            {t.invoices.pay}
                                        </Button>
                                    )}

                                    {(invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID') && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openPaymentModal(invoice, "REFUND")}
                                            className="text-gray-500 hover:text-gray-700"
                                            title={t.invoices.refund}
                                        >
                                            <RefreshCcw className="w-4 h-4" />
                                        </Button>
                                    )}

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID' || (invoice as any).amountPaid > 0}
                                        title={invoice.status === 'PAID' || (invoice as any).amountPaid > 0 ? t.invoices.cannotDeletePaid : t.invoices.deleteConfirm}
                                        onClick={async () => {
                                            if (confirm(t.invoices.deleteConfirm)) {
                                                const toastId = toast.loading(t.invoices.deleting);
                                                try {
                                                    await deleteInvoice(invoice.id);
                                                    toast.success(t.invoices.deleted, { id: toastId });
                                                } catch (error) {
                                                    toast.error(t.invoices.deleteError, { id: toastId });
                                                }
                                            }
                                        }}
                                        className={`
                                            ${invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID' || (invoice as any).amountPaid > 0
                                                ? "text-gray-300 cursor-not-allowed"
                                                : "text-red-500 hover:text-red-700 hover:bg-red-50"}
                                        `}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredInvoices.length === 0 && (
                        <div className="p-8 text-center text-gray-500 italic">
                            {t.invoices.noInvoices}
                        </div>
                    )}
                </div>
            </div>

            {paymentInvoice && (
                <PaymentDialog
                    isOpen={paymentModalOpen}
                    onClose={() => {
                        setPaymentModalOpen(false);
                        setPaymentInvoice(null);
                    }}
                    invoiceId={paymentInvoice.id}
                    total={paymentInvoice.total}
                    amountPaid={(paymentInvoice as any).amountPaid || 0}
                    type={paymentModalType}
                />
            )}
        </div>
    );
}
