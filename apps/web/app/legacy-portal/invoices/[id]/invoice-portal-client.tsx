"use client";

import { Invoice, Client, InvoiceItem, Product } from "@prisma/client";
import { format } from "date-fns";
import { CheckCircle, Download } from "lucide-react";
import { DownloadPdfButton } from "@/components/invoices/download-pdf-button";

interface InvoicePortalClientProps {
    invoice: Invoice & {
        client: Client;
        items: (InvoiceItem & { product: Product })[];
    };
}

export function InvoicePortalClient({ invoice }: { invoice: any }) {
    const total = invoice.total;
    const subtotal = total - (invoice.tax || 0);

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 px-6 py-8 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold">INVOICE</h1>
                            <p className="mt-2 text-slate-300">#{invoice.number || invoice.id.slice(0, 8)}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-semibold">
                                {invoice.division === "EXTERMINATION" ? "Extermination ZLS" : "Les Entreprises ZLS"}
                            </h2>
                            <p className="text-sm text-slate-300 mt-1">123 Business St.</p>
                            <p className="text-sm text-slate-300">City, State, Zip</p>
                            <p className="text-sm text-slate-300">info@zls.com</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8">
                    {/* Status Banner */}
                    {invoice.status === "PAID" && (
                        <div className="mb-8 bg-green-50 border border-green-200 rounded-md p-4 flex items-center text-green-800">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            <span className="font-semibold">This invoice has been paid</span>
                        </div>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Bill To</h3>
                            <p className="mt-2 font-medium text-gray-900 text-lg">{invoice.client.name}</p>
                            <p className="text-gray-600">{invoice.client.billingAddress}</p>
                            <p className="text-gray-600">{invoice.client.email}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Date</h3>
                                <p className="mt-1 font-medium">{format(new Date(invoice.issuedDate), "PPP")}</p>
                            </div>
                            <div>
                                <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Due Date</h3>
                                <p className="mt-1 font-medium">{invoice.dueDate ? format(new Date(invoice.dueDate), "PPP") : "-"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full mb-8">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-2 text-gray-500 font-medium text-sm">Description</th>
                                <th className="text-right py-3 px-2 text-gray-500 font-medium text-sm">Qty</th>
                                <th className="text-right py-3 px-2 text-gray-500 font-medium text-sm">Price</th>
                                <th className="text-right py-3 px-2 text-gray-500 font-medium text-sm">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {invoice.items.map((item) => (
                                <tr key={item.id}>
                                    <td className="py-4 px-2">
                                        <p className="font-medium text-gray-900">{item.product.name}</p>
                                        {(item.description || item.product.description) && (
                                            <p className="text-sm text-gray-500">{item.description || item.product.description}</p>
                                        )}
                                    </td>
                                    <td className="text-right py-4 px-2 text-gray-600">{item.quantity}</td>
                                    <td className="text-right py-4 px-2 text-gray-600">${item.price.toFixed(2)}</td>
                                    <td className="text-right py-4 px-2 font-medium text-gray-900">
                                        ${(item.quantity * item.price).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end p-4 bg-gray-50 rounded-lg">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal:</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Tax:</span>
                                <span>${invoice.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-200">
                                <span>Total:</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                            {/* @ts-ignore */}
                            {(invoice.amountPaid || 0) > 0 && (
                                <div className="flex justify-between text-green-600 pt-2 font-medium">
                                    <span>Paid:</span>
                                    {/* @ts-ignore */}
                                    <span>-${invoice.amountPaid.toFixed(2)}</span>
                                </div>
                            )}
                            {/* @ts-ignore */}
                            {(invoice.amountPaid || 0) > 0 && (
                                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                                    <span>Balance Due:</span>
                                    {/* @ts-ignore */}
                                    <span>${(invoice.total - (invoice.amountPaid || 0)).toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-12 border-t pt-8 flex justify-center">
                        <DownloadPdfButton invoice={invoice} />
                        <span className="ml-2 flex items-center text-sm text-gray-500">Download PDF for your records</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
