"use client";

import { Quote, Client, QuoteItem, Product } from "@prisma/client";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { SignaturePad } from "@/components/ui/signature-pad";
import { signQuote } from "@/app/actions/portal-actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";
import Image from "next/image";

interface QuotePortalClientProps {
    quote: Quote & {
        client: Client;
        items: (QuoteItem & { product: Product })[];
    };
}

export function QuotePortalClient({ quote }: { quote: any }) {
    const [isSigning, setIsSigning] = useState(false);
    const [signature, setSignature] = useState<string>("");

    const handleSign = async (data: string) => {
        setSignature(data);
    };

    const submitSignature = async () => {
        if (!signature) {
            toast.error("Please sign the quote first");
            return;
        }

        setIsSigning(true);
        try {
            const result = await signQuote(quote.id, signature);
            if (result.success) {
                toast.success("Quote accepted successfully!");
                // Optionally reload or update local state
                window.location.reload();
            } else {
                toast.error("Failed to accept quote: " + result.error);
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsSigning(false);
        }
    };

    const total = quote.total;
    const subtotal = total - (quote.tax || 0);

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 px-6 py-8 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold">QUOTE</h1>
                            <p className="mt-2 text-slate-300">#{quote.number || quote.id.slice(0, 8)}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-semibold">
                                {quote.division === "EXTERMINATION" ? "Extermination ZLS" : "Les Entreprises ZLS"}
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
                    {quote.status === "ACCEPTED" && (
                        <div className="mb-8 bg-green-50 border border-green-200 rounded-md p-4 flex items-center text-green-800">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            <span className="font-semibold">This quote has been accepted</span>
                            {quote.signedAt && (
                                <span className="ml-2 text-sm">on {format(new Date(quote.signedAt), "PPP")}</span>
                            )}
                        </div>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Bill To</h3>
                            <p className="mt-2 font-medium text-gray-900 text-lg">{quote.client.name}</p>
                            <p className="text-gray-600">{quote.client.billingAddress}</p>
                            <p className="text-gray-600">{quote.client.email}</p>
                            <p className="text-gray-600">{format(new Date(quote.client.createdAt), "PPP")}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Date</h3>
                                <p className="mt-1 font-medium">{format(new Date(quote.issuedDate), "PPP")}</p>
                            </div>
                            <div>
                                <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Total</h3>
                                <p className="mt-1 font-medium text-xl text-slate-900">${total.toFixed(2)}</p>
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
                            {quote.items.map((item) => (
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
                                <span>${quote.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-200">
                                <span>Total:</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Signature Section */}
                    <div className="mt-12 border-t pt-8">
                        <h3 className="text-lg font-semibold mb-4">Acceptance</h3>

                        {quote.status === "ACCEPTED" ? (
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">Signed by Client:</p>
                                {quote.signature ? (
                                    <img src={quote.signature} alt="Signature" className="h-24 border rounded bg-white" />
                                ) : (
                                    <p className="italic text-gray-400">No digital signature stored</p>
                                )}
                            </div>
                        ) : (
                            <div className="max-w-md">
                                <p className="text-sm text-gray-600 mb-4">
                                    Please sign below to accept this quote. By signing, you agree to the terms and conditions.
                                </p>
                                <SignaturePad onSign={handleSign} />
                                <div className="mt-4">
                                    <Button
                                        onClick={submitSignature}
                                        disabled={!signature || isSigning}
                                        className="w-full"
                                    >
                                        {isSigning ? "Processing..." : "Accept & Sign Quote"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
