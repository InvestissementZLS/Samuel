"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPortalInvoice } from "@/app/actions/portal-actions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, CreditCard, Download, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/pdf/invoice-pdf";
import { PaymentModal } from "@/components/portal/payment-modal";

export default function InvoicePreviewPage() {
    const params = useParams();
    const router = useRouter();
    // @ts-ignore
    const token = typeof params?.token === 'string' ? params.token : "";
    // @ts-ignore
    const id = typeof params?.id === 'string' ? params.id : "";

    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState<any>(null);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);

    useEffect(() => {
        if (!token || !id) return;

        const fetchData = async () => {
            try {
                const data = await getPortalInvoice(token, id);
                if (!data) {
                    toast.error("Invoice not found");
                    router.push(`/portal/${token}`);
                    return;
                }
                setInvoice(data);
            } catch (e) {
                console.error(e);
                toast.error("Failed to load invoice");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token, id, router]);

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
    if (!invoice) return null;

    const isExtermination = invoice.division === "EXTERMINATION";
    const amountPaid = invoice.transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
    const balanceDue = invoice.total - amountPaid;
    const isPaid = balanceDue <= 0.01;

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
                        document={<InvoicePDF invoice={invoice} language="FR" />}
                        fileName={`Invoice-${invoice.number || invoice.id.slice(0, 8)}.pdf`}
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
                        <h1 className="text-2xl font-bold text-gray-900 mt-4 uppercase tracking-wide">Facture</h1>
                        <p className="text-gray-500">#{invoice.number || invoice.id.slice(0, 8)}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-semibold">{format(new Date(invoice.createdAt), "d MMMM yyyy", { locale: fr })}</div>
                        {isPaid ? (
                            <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase bg-green-100 text-green-800 border border-green-200">
                                Payée
                            </div>
                        ) : (
                            <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase bg-red-100 text-red-800 border border-red-200">
                                À payer: {balanceDue.toFixed(2)} $
                            </div>
                        )}
                    </div>
                </header>

                <div className="p-8 space-y-8">
                    {/* Addresses */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Facturer à</h3>
                            <div className="font-semibold">{invoice.client.name}</div>
                            <div>{invoice.client.email}</div>
                            <div>{invoice.client.phone}</div>
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
                            {invoice.items.map((item: any) => (
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
                                <td colSpan={3} className="px-6 py-3 text-right text-gray-500">Sous-total</td>
                                <td className="px-6 py-3 text-right text-gray-900">{(invoice.total - invoice.tax).toFixed(2)} $</td>
                            </tr>
                            <tr>
                                <td colSpan={3} className="px-6 py-3 text-right text-gray-500">Taxes</td>
                                <td className="px-6 py-3 text-right text-gray-900">{invoice.tax?.toFixed(2) || "0.00"} $</td>
                            </tr>
                            <tr className="border-t-2 border-gray-200">
                                <td colSpan={3} className="px-6 py-3 text-right font-bold text-gray-900 text-lg">Total</td>
                                <td className="px-6 py-3 text-right font-bold text-gray-900 text-lg">{invoice.total.toFixed(2)} $</td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Footer Actions */}
                    <div className="border-t pt-8 mt-8 flex flex-col md:flex-row items-center justify-end gap-4 print:hidden">
                        {!isPaid && (
                            <button
                                onClick={() => setIsPaymentOpen(true)}
                                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow flex items-center gap-2"
                            >
                                <CreditCard className="h-5 w-5" />
                                Payer maintenant ({balanceDue.toFixed(2)} $)
                            </button>
                        )}
                        {isPaid && (
                            <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-lg">
                                <CheckCircle className="h-5 w-5" />
                                Facture payée
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={isPaymentOpen}
                onClose={() => setIsPaymentOpen(false)}
                invoiceId={invoice.id}
                amount={balanceDue}
                onSuccess={() => {
                    setIsPaymentOpen(false);
                    toast.success("Payment Received!");
                    window.location.reload();
                }}
            />
        </div>
    );
}
