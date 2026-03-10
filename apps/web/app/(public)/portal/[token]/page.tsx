"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPortalData, cancelJob } from "@/app/actions/portal-actions";
import { format, isAfter, addHours } from "date-fns";
import { Calendar, Clock, AlertTriangle, CheckCircle, XCircle, FileText, CreditCard, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { dictionary, Locale } from "@/lib/i18n/dictionary";
import { PaymentModal } from "@/components/portal/payment-modal";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/pdf/invoice-pdf";
import { QuotePDF } from "@/components/pdf/quote-pdf";
import Image from "next/image";

// Skeleton Loader
function SkeletonCard() {
    return (
        <div className="border rounded-lg p-6 shadow-sm animate-pulse bg-white">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
    );
}

export default function ClientPortalPage() {
    const params = useParams();
    const router = useRouter();
    // @ts-ignore
    const token = typeof params?.token === 'string' ? params.token : "";

    const [loading, setLoading] = useState(true);
    const [client, setClient] = useState<any>(null);
    const [jobs, setJobs] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [processing, setProcessing] = useState<string | null>(null);

    // Payment State
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);

    // Language (Derive from client preference later, default FR for now as per project)
    const [language, setLanguage] = useState<Locale>('fr');
    // Default to EN if language not found, but FR if specified
    const t = dictionary[language as keyof typeof dictionary] || dictionary.fr;
    const p = t.portal || dictionary.fr.portal;

    useEffect(() => {
        if (!token) return;

        const fetchData = async () => {
            try {
                const data = await getPortalData(token);
                if (!data || 'error' in data) {
                    toast.error(t.portal.invalidLink);
                    return;
                }
                setClient(data);

                if (data.invoices) {
                    setInvoices(data.invoices);
                }

                if (data.properties) {
                    const allJobs = data.properties.flatMap((p: any) => p.jobs || []);
                    // Sort by date
                    allJobs.sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
                    setJobs(allJobs);
                }

                if (data.language) {
                    setLanguage(data.language.toLowerCase() as Locale);
                }
            } catch (e) {
                console.error(e);
                toast.error("Failed to load portal");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token, router]);

    const handleCancel = async (jobId: string) => {
        if (!confirm(p.confirmCancel)) return;

        setProcessing(jobId);
        try {
            await cancelJob(token, jobId);
            toast.success(p.cancelSuccess);
            // Refresh
            const data = await getPortalData(token);
            if (data && data.properties) {
                const allJobs = data.properties.flatMap((p: any) => p.jobs || []);
                allJobs.sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
                setJobs(allJobs);
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to cancel");
        } finally {
            setProcessing(null);
        }
    };

    const handleReschedule = async (jobId: string) => {
        if (!confirm(p.confirmReschedule)) return;

        setProcessing(jobId);
        try {
            await cancelJob(token, jobId);
            toast.success(p.rescheduleSuccess);
            router.push(`/booking/${token}`);
        } catch (e: any) {
            toast.error(e.message || "Failed to reschedule");
            setProcessing(null);
        }
    };

    const handlePaymentSuccess = () => {
        setIsPaymentOpen(false);
        toast.success("Payment Received!");
        // Reload to update invoice status
        window.location.reload();
    };


    // Separate jobs
    const now = new Date();
    const upcomingJobs = jobs.filter(j => new Date(j.scheduledAt) >= now && j.status !== 'CANCELLED' && j.status !== 'COMPLETED');
    const pastJobs = jobs.filter(j => new Date(j.scheduledAt) < now || j.status === 'CANCELLED' || j.status === 'COMPLETED');

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 md:p-8">
                <div className="max-w-3xl mx-auto space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-8 animate-pulse"></div>
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-xl font-semibold text-gray-900">{p.accessDenied}</h1>
                    <p className="text-gray-500">{p.invalidLink}</p>
                </div>
            </div>
        );
    }

    // Warranty calculation from properties
    const allProperties = client.properties || [];
    const latestWarranty = allProperties
        .map((p: any) => p.warrantyExpiresAt ? new Date(p.warrantyExpiresAt) : null)
        .filter(Boolean)
        .sort((a: any, b: any) => b.getTime() - a.getTime())[0];

    const warrantyDaysLeft = latestWarranty
        ? Math.floor((latestWarranty.getTime() - now.getTime()) / 86400000)
        : null;
    const warrantyActive = warrantyDaysLeft !== null && warrantyDaysLeft > 0;
    const warrantyExpiredRecently = warrantyDaysLeft !== null && warrantyDaysLeft < 0 && warrantyDaysLeft > -60;

    // Visit stats
    const completedVisits = jobs.filter(j => j.status === 'COMPLETED').length;
    const totalVisits = jobs.length;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{p.title}</h1>
                        <p className="text-gray-500 mt-0.5">{client.name}</p>
                    </div>
                    {client.divisions?.includes("RENOVATION") ? (
                        <img src="/renovation-logo.png" alt="Rénovation Esthéban" className="h-12 w-auto object-contain" />
                    ) : (
                        <img src="/zls-logo.png" alt="Extermination ZLS" className="h-12 w-auto object-contain" />
                    )}
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* ── Garantie & Statistiques ── */}
                <div className="grid gap-4 md:grid-cols-3">
                    {/* Guarantee card */}
                    {(warrantyActive || warrantyExpiredRecently) && (
                        <div className={`md:col-span-2 rounded-xl border p-5 ${warrantyActive ? 'bg-white border-gray-200' : 'bg-amber-50 border-amber-200'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className={`w-5 h-5 ${warrantyActive ? (warrantyDaysLeft! <= 30 ? 'text-amber-500' : 'text-emerald-500') : 'text-gray-400'}`} />
                                    <span className="font-semibold text-gray-900 text-sm">
                                        {language === 'fr' ? 'Garantie' : 'Warranty'}
                                    </span>
                                </div>
                                {latestWarranty && (
                                    <span className="text-xs text-gray-500">
                                        {language === 'fr' ? 'Expire le' : 'Expires'} {format(latestWarranty, 'd MMM yyyy')}
                                    </span>
                                )}
                            </div>
                            {warrantyActive ? (
                                <>
                                    <p className={`text-2xl font-bold mb-2 ${warrantyDaysLeft! <= 7 ? 'text-red-600' : warrantyDaysLeft! <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {warrantyDaysLeft} {language === 'fr' ? 'jours restants' : 'days remaining'}
                                    </p>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${warrantyDaysLeft! <= 7 ? 'bg-red-500' : warrantyDaysLeft! <= 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.min(100, Math.max(2, (warrantyDaysLeft! / 365) * 100))}%` }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <p className="text-sm font-medium text-amber-800 mb-2">
                                        {language === 'fr' ? `Garantie expirée il y a ${Math.abs(warrantyDaysLeft!)} jours` : `Warranty expired ${Math.abs(warrantyDaysLeft!)} days ago`}
                                    </p>
                                    <a
                                        href={`/booking/${token}`}
                                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
                                    >
                                        {language === 'fr' ? 'Renouveler' : 'Renew service'}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Visit counter */}
                    {totalVisits > 0 && (
                        <div className="rounded-xl border bg-white border-gray-200 p-5">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                {language === 'fr' ? 'Visites' : 'Visits'}
                            </p>
                            <p className="text-3xl font-bold text-gray-900">{completedVisits}<span className="text-lg text-gray-400">/{totalVisits}</span></p>
                            <p className="text-xs text-gray-400 mt-1">{language === 'fr' ? 'complétées' : 'completed'}</p>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full transition-all"
                                    style={{ width: totalVisits > 0 ? `${(completedVisits / totalVisits) * 100}%` : '0%' }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Devis ── */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-amber-600" />
                        {language === 'fr' ? 'Soumissions' : 'Quotes'}
                    </h2>

                    {client?.quotes?.length === 0 ? (
                        <div className="bg-white rounded-xl p-6 text-center border border-gray-200 text-gray-400 text-sm">
                            {language === 'fr' ? 'Aucune soumission active.' : 'No active quotes.'}
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {client?.quotes?.map((quote: any) => (
                                <div key={quote.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-semibold text-gray-900">
                                                {language === 'fr' ? 'Soumission' : 'Quote'} #{quote.number || quote.id.slice(0, 8)}
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                {format(new Date(quote.issuedDate), "d MMM yyyy")} • {quote.total.toFixed(2)}$
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${quote.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                                                    quote.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {quote.status}
                                            </span>
                                            {['DRAFT', 'SENT'].includes(quote.status) && (
                                                <button
                                                    onClick={() => router.push(`/portal/${token}/quote/${quote.id}`)}
                                                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    {language === 'fr' ? 'Voir & Répondre' : 'View & Respond'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Invoices Section */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        Invoices
                    </h2>

                    {invoices.length === 0 ? (
                        <div className="bg-white rounded-lg p-6 text-center border text-gray-500 text-sm">
                            No invoices found.
                        </div>
                    ) : (
                        <div className="bg-white shadow rounded-lg overflow-hidden border">
                            <ul className="divide-y divide-gray-200">
                                {invoices.map((inv) => (
                                    <li key={inv.id} className="p-4 hover:bg-gray-50">
                                        <div className="flex justify-between items-center flex-wrap gap-4">
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    Invoice #{inv.number || inv.id.slice(0, 8)}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {format(new Date(inv.issuedDate), "d MMM yyyy")} • Total: ${inv.total.toFixed(2)}
                                                </div>
                                                {inv.status === 'PAID' && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                                                        Paid
                                                    </span>
                                                )}
                                                {inv.status !== 'PAID' && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                                                        Balance: ${(inv.total - (inv.amountPaid || 0)).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => router.push(`/portal/${token}/invoice/${inv.id}`)}
                                                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 bg-blue-50 px-3 py-1.5 rounded"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Voir
                                                </button>
                                                {inv.status !== 'PAID' && (inv.total - (inv.amountPaid || 0)) > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedInvoice(inv);
                                                            setIsPaymentOpen(true);
                                                        }}
                                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                                                    >
                                                        <CreditCard className="h-4 w-4 mr-2" />
                                                        Pay Now
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>

                {/* Upcoming */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-indigo-600" />
                        {p.upcoming}
                    </h2>

                    {upcomingJobs.length === 0 ? (
                        <div className="bg-white rounded-lg p-8 text-center border text-gray-500">
                            {p.noUpcoming}
                            <div className="mt-4">
                                <a
                                    href={`/booking/${token}`}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {p.bookService}
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                            {upcomingJobs.map(job => {
                                const jobDate = new Date(job.scheduledAt);
                                const isCancellable = isAfter(jobDate, addHours(new Date(), 24));
                                const products = job.products?.map((p: any) => p.product.name).join(", ");

                                return (
                                    <div key={job.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                        <div className="p-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-semibold text-lg text-gray-900">
                                                        {format(jobDate, "EEEE, d MMM yyyy")}
                                                    </div>
                                                    <div className="text-gray-500 flex items-center gap-1 mt-1">
                                                        <Clock className="h-4 w-4" />
                                                        {format(jobDate, "HH:mm")} ({job.durationMinutes || 60}m)
                                                    </div>
                                                    <div className="text-gray-600 mt-2 font-medium">
                                                        {products || "Service"}
                                                    </div>
                                                    {job.property && (
                                                        <div className="text-sm text-gray-400 mt-1">
                                                            {job.property.address}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                                                    {job.status}
                                                </div>
                                            </div>

                                            <div className="mt-6 flex border-t pt-4 gap-3">
                                                {isCancellable ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleReschedule(job.id)}
                                                            disabled={processing === job.id}
                                                            className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-md text-sm font-medium transition-colors"
                                                        >
                                                            {p.reschedule}
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancel(job.id)}
                                                            disabled={processing === job.id}
                                                            className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2 px-4 rounded-md text-sm font-medium transition-colors"
                                                        >
                                                            {processing === job.id ? p.processing : p.cancel}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="w-full text-center text-sm text-amber-600 bg-amber-50 py-2 rounded">
                                                        {p.tooLate}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* History */}
                {pastJobs.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 text-gray-500">
                            {p.history}
                        </h2>
                        <div className="bg-white shadow rounded-lg overflow-hidden border">
                            <ul className="divide-y divide-gray-200">
                                {pastJobs.map(job => {
                                    const jobDate = new Date(job.scheduledAt);

                                    return (
                                        <li key={job.id} className="hover:bg-gray-50 transition-colors">
                                            <div className="p-4 flex justify-between items-center group cursor-pointer" onClick={() => router.push(`/portal/${token}/job/${job.id}`)}>
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900 flex items-center gap-2">
                                                        <span>{format(jobDate, "d MMM yyyy")}</span>
                                                        <span className="text-gray-400">|</span>
                                                        <span className="text-gray-700 group-hover:text-indigo-600 transition-colors">
                                                            {job.products?.map((p: any) => p.product.name).join(", ") || "Service"}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {job.property?.address}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        {job.status === 'CANCELLED' ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                {p.cancelled}
                                                            </span>
                                                        ) : job.status === 'COMPLETED' ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                {p.completed}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                                {job.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-gray-400 group-hover:text-indigo-600 transition-colors flex items-center gap-1 text-sm font-medium">
                                                        Voir Rapport <Eye className="h-4 w-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </section>
                )}

                {/* Payment Modal */}
                {
                    selectedInvoice && (
                        <PaymentModal
                            isOpen={isPaymentOpen}
                            onClose={() => setIsPaymentOpen(false)}
                            invoiceId={selectedInvoice.id}
                            amount={selectedInvoice.total - selectedInvoice.amountPaid}
                            onSuccess={handlePaymentSuccess}
                        />
                    )
                }

            </main >
        </div >
    );
}
