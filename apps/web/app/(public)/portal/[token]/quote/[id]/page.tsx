"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPortalQuote, respondToQuote } from "@/app/actions/portal-actions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, CheckCircle, XCircle, Printer, Download, Mail } from "lucide-react";
import { toast } from "sonner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { QuotePDF } from "@/components/pdf/quote-pdf";

export default function QuotePreviewPage() {
    const params = useParams();
    const router = useRouter();
    // @ts-ignore
    const token = typeof params?.token === 'string' ? params.token : "";
    // @ts-ignore
    const id = typeof params?.id === 'string' ? params.id : "";

    const [loading, setLoading] = useState(true);
    const [quote, setQuote] = useState<any>(null);
    const [processing, setProcessing] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    useEffect(() => {
        if (!token || !id) return;

        const fetchData = async () => {
            try {
                const data = await getPortalQuote(token, id);
                if (!data) {
                    toast.error("Quote not found");
                    router.push(`/portal/${token}`);
                    return;
                }
                setQuote(data);
            } catch (e) {
                console.error(e);
                toast.error("Failed to load quote");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token, id, router]);

    const handleResponse = async (action: 'ACCEPTED' | 'REJECTED') => {
        if (!confirm(action === 'ACCEPTED' ? "Accept this quote?" : "Reject this quote?")) return;

        setProcessing(true);
        try {
            await respondToQuote(token, id, action);
            toast.success(action === 'ACCEPTED' ? "Quote accepted!" : "Quote rejected");
            window.location.reload();
        } catch (e) {
            toast.error("Error updating quote");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
    if (!quote) return null;

    const isExtermination = quote.division === "EXTERMINATION";

    return (
        <div className="min-h-screen bg-gray-100 print:bg-white p-4 md:p-8 print:p-0">
            {/* Nav */}
            <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 border px-3 py-1 rounded bg-white shadow-sm">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>
                <div className="flex gap-2">
                    <PDFDownloadLink
                        document={<QuotePDF quote={quote} language="FR" />}
                        fileName={`Quote-${quote.number || quote.id.slice(0, 8)}.pdf`}
                        className="flex items-center gap-2 bg-white text-gray-700 border px-4 py-2 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        {({ loading }) => (
                            <>
                                <Download className="h-4 w-4" />
                                {loading ? '...' : 'Download PDF'}
                            </>
                        )}
                    </PDFDownloadLink>
                </div>
            </div>

            {/* Document */}
            <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none rounded-xl overflow-hidden print:rounded-none">
                <header className="border-b-2 border-indigo-600 p-8 flex justify-between items-start">
                    <div>
                        {isExtermination ? (
                            <img src="/zls-logo.png" alt="ZLS" className="h-16 object-contain mb-2" />
                        ) : (
                            <img src="/logo.png" alt="Logo" className="h-16 object-contain mb-2" />
                        )}
                        <h1 className="text-2xl font-bold text-gray-900 mt-4 uppercase tracking-wide">Soumission</h1>
                        <p className="text-gray-500">#{quote.number || quote.id.slice(0, 8)}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-semibold">{format(new Date(quote.createdAt), "d MMMM yyyy", { locale: fr })}</div>
                        <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase bg-gray-100 text-gray-800">
                            {quote.status}
                        </div>
                    </div>
                </header>

                <div className="p-8 space-y-8">
                    {/* Addresses */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Facturer à</h3>
                            <div className="font-semibold">{quote.client.name}</div>
                            <div>{quote.client.email}</div>
                            <div>{quote.client.phone}</div>
                        </div>
                        <div>
                            {quote.property && (
                                <>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Lieu de service</h3>
                                    <div>{quote.property.address}</div>
                                    <div>{quote.property.city}, {quote.property.postalCode}</div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Items */}
                    <table className="min-w-full divide-y divide-gray-200 border rounded-lg overflow-hidden">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qté</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {quote.items.map((item: any) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{item.product?.name || "Item"}</div>
                                        {item.description && <div className="text-sm text-gray-500">{item.description}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-500">{item.quantity}</td>
                                    <td className="px-6 py-4 text-right text-gray-500">{item.price.toFixed(2)} $</td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900">{(item.price * item.quantity).toFixed(2)} $</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                            <tr>
                                <td colSpan={3} className="px-6 py-3 text-right font-medium text-gray-900">Sous-total</td>
                                <td className="px-6 py-3 text-right font-bold text-gray-900">{quote.total.toFixed(2)} $</td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Actions */}
                    {quote.terms && (
                        <div className="border-t pt-8 mt-8">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Conditions de paiement / Payment Terms</h3>
                            <div className="bg-gray-50 p-4 rounded-lg border text-sm text-gray-700 whitespace-pre-wrap font-mono">
                                {quote.terms}
                            </div>

                            {(quote.status === 'DRAFT' || quote.status === 'SENT') && (
                                <div className="mt-4 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="terms-check"
                                        checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <label htmlFor="terms-check" className="text-sm font-medium text-gray-900 cursor-pointer select-none">
                                        J'accepte les conditions de paiement / I agree to the payment terms
                                    </label>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    {quote.status === 'DRAFT' || quote.status === 'SENT' ? (
                        <div className="border-t pt-8 mt-8 flex flex-col md:flex-row items-center justify-end gap-4 print:hidden">
                            <button
                                onClick={() => handleResponse('REJECTED')}
                                disabled={processing}
                                className="px-6 py-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50"
                            >
                                Refuser
                            </button>
                            <button
                                onClick={() => handleResponse('ACCEPTED')}
                                disabled={processing || (!!quote.terms && !termsAccepted)}
                                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <CheckCircle className="h-5 w-5" />
                                Accepter la soumission
                            </button>
                        </div>
                    ) : (
                        <div className="border-t pt-8 mt-8 text-center md:text-right text-gray-500 print:hidden">
                            {quote.status === 'ACCEPTED' ? (
                                <div className="flex items-center justify-end gap-2 text-green-600 font-bold">
                                    <CheckCircle className="h-5 w-5" />
                                    Soumission acceptée le {quote.signedAt ? format(new Date(quote.signedAt), "d MMM yyyy") : ""}
                                </div>
                            ) : (
                                <div>Statut: {quote.status}</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
