"use client";

import { useState, useEffect } from "react";
import { Invoice, Product, Client } from "@prisma/client";
import { createInvoice, updateInvoiceStatus, updateInvoice } from "@/app/actions/client-portal-actions";
import { createCheckoutSession } from "@/app/actions/payment-actions";
import { format } from "date-fns";
import { toast } from "sonner";
import { FileText, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { useDivision } from "@/components/providers/division-provider";
import Link from "next/link";

interface InvoiceListProps {
    invoices: (Invoice & { items: (any & { product: Product })[], client: Client })[];
    products: Product[];
    clientId?: string; // Optional, if provided, restricts creation to this client
}

export function InvoiceList({ invoices, products, clientId }: InvoiceListProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const { division } = useDivision();
    const [divisionFilter, setDivisionFilter] = useState<"ALL" | "EXTERMINATION" | "ENTREPRISES">(division);

    useEffect(() => {
        setDivisionFilter(division);
    }, [division]);

    const handleCreateNew = () => {
        if (!clientId) {
            toast.error("Please go to a Client's page to create a new invoice.");
            return;
        }
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
                toast.success("Invoice updated");
            } else {
                await createInvoice(data);
                toast.success("Invoice created");
            }
            setIsEditing(false);
        } catch (error) {
            toast.error("Failed to save invoice");
            console.error(error);
        }
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
                    &larr; Back to Invoices
                </Button>
                <InvoiceForm
                    invoice={selectedInvoice}
                    products={products}
                    clientId={selectedInvoice?.clientId || clientId || ""}
                    onSave={handleSave}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Invoices</h3>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3 py-1.5">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={divisionFilter}
                            onChange={(e) => setDivisionFilter(e.target.value as any)}
                            className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer text-gray-900"
                        >
                            <option value="ALL">All Divisions</option>
                            <option value="EXTERMINATION">Extermination</option>
                            <option value="ENTREPRISES">Entreprises</option>
                        </select>
                    </div>
                    {clientId && (
                        <Button onClick={handleCreateNew}>
                            + New Invoice
                        </Button>
                    )}
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
                                                {invoice.number || (invoice.poNumber ? `PO #${invoice.poNumber}` : "Invoice")}
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
                                                        {invoice.division === "EXTERMINATION" ? "EXO" : "ENT"}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                        ${invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                            invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                                                invoice.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                        {invoice.status}
                                    </span>
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(invoice)}>
                                        Edit
                                    </Button>
                                    <div className="flex gap-1">
                                        <a
                                            href={`/api/invoices/${invoice.id}/pdf`}
                                            target="_blank"
                                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                                        >
                                            PDF
                                        </a>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={async () => {
                                                const toastId = toast.loading("Sending email...");
                                                try {
                                                    const { sendInvoice } = await import("@/app/actions/email-actions");
                                                    const result = await sendInvoice(invoice.id);
                                                    if (result.success) {
                                                        toast.success("Email sent!", { id: toastId });
                                                    } else {
                                                        toast.error("Failed to send email: " + (result.error || "Unknown error"), { id: toastId });
                                                    }
                                                } catch (error) {
                                                    toast.error("Error sending email", { id: toastId });
                                                }
                                            }}
                                        >
                                            Email
                                        </Button>
                                    </div>
                                    {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
                                        <Button
                                            onClick={async () => {
                                                const toastId = toast.loading("Redirecting to checkout...");
                                                try {
                                                    const result = await createCheckoutSession(invoice.id);
                                                    if (result.url) {
                                                        window.location.href = result.url;
                                                    } else {
                                                        toast.error(result.error || "Failed to create checkout session", { id: toastId });
                                                    }
                                                } catch (error) {
                                                    toast.error("An error occurred", { id: toastId });
                                                }
                                            }}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            size="sm"
                                        >
                                            Pay Now
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredInvoices.length === 0 && (
                        <div className="p-8 text-center text-gray-500 italic">
                            No invoices found for this selection.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
