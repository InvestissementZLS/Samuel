import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import Link from 'next/link';
import { createCheckoutSession } from '@/app/actions/payment-actions';
import { toast } from 'sonner';
import { ClientPortalInvoice } from '@/components/clients/client-portal-invoice';
import { translations, Language } from '@/lib/translations';

export default async function ClientPortalPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const client = await prisma.client.findUnique({
        where: { id },
        include: {
            invoices: {
                orderBy: { createdAt: 'desc' },
                include: {
                    items: {
                        include: { product: true },
                    },
                },
            },
            properties: {
                include: {
                    jobs: {
                        where: {
                            scheduledAt: { gte: new Date() },
                            status: { not: 'CANCELLED' },
                        },
                        orderBy: { scheduledAt: 'asc' },
                        include: {
                            technicians: true,
                            property: true,
                        }
                    }
                }
            }
        },
    });

    if (!client) {
        notFound();
    }

    const lang = (client.language as Language) || "FR";
    const t = translations[lang];
    const dateLocale = lang === "FR" ? fr : enUS;

    const openInvoices = client.invoices.filter(inv => inv.status === 'SENT' || inv.status === 'OVERDUE');
    const paidInvoices = client.invoices.filter(inv => inv.status === 'PAID');
    const upcomingJobs = client.properties.flatMap(p => p.jobs);

    const quotes = await prisma.quote.findMany({
        where: { clientId: id, status: { not: 'DRAFT' } },
        orderBy: { createdAt: 'desc' },
        include: { items: true }
    });

    const pastJobs = await prisma.job.findMany({
        where: {
            property: { clientId: id },
            status: 'COMPLETED'
        },
        orderBy: { completedAt: 'desc' },
        include: {
            property: true,
            products: {
                include: { product: true }
            },
            technicians: true
        }
    });

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">{t.portalTitle}</h1>
                    <div className="text-right">
                        <p className="text-lg font-medium text-gray-900">{client.name}</p>
                        <p className="text-sm text-gray-500">{client.email}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0 space-y-8">

                    {/* Outstanding Balance / Invoices */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">{t.outstandingInvoices}</h3>
                        </div>
                        <div className="px-4 py-5 sm:p-6">
                            {openInvoices.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {openInvoices.map(invoice => (
                                        <ClientPortalInvoice key={invoice.id} invoice={invoice} language={lang} />
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic">{t.noOutstandingInvoices}</p>
                            )}
                        </div>
                    </div>

                    {/* Quotes */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Quotes</h3>
                        </div>
                        <div className="px-4 py-5 sm:p-6">
                            {quotes.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {quotes.map(quote => (
                                        <li key={quote.id} className="py-4 flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    Quote #{quote.number || quote.id.slice(0, 8)}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {format(new Date(quote.createdAt), 'MMM d, yyyy', { locale: dateLocale })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900">${quote.total.toFixed(2)}</p>
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${quote.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                                                        quote.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'}`}>
                                                    {quote.status}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic">No quotes found.</p>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Jobs */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">{t.upcomingAppointments}</h3>
                        </div>
                        <div className="px-4 py-5 sm:p-6">
                            {upcomingJobs.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {upcomingJobs.map(job => (
                                        <li key={job.id} className="py-4">
                                            <div className="flex justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {format(new Date(job.scheduledAt), 'PPP p', { locale: dateLocale })}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{job.property.address}</p>
                                                    {job.technicians.length > 0 && (
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {t.tech}: {job.technicians.map(t => t.name).join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                        {t.status[job.status] || job.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic">{t.noUpcomingAppointments}</p>
                            )}
                        </div>
                    </div>

                    {/* Job History */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Job History</h3>
                        </div>
                        <div className="px-4 py-5 sm:p-6">
                            {pastJobs.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {pastJobs.map(job => (
                                        <li key={job.id} className="py-4">
                                            <div className="mb-2">
                                                <div className="flex justify-between">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {format(new Date(job.completedAt!), 'PPP', { locale: dateLocale })}
                                                    </p>
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                        COMPLETED
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500">{job.property.address}</p>
                                            </div>

                                            {/* Treatment / Description */}
                                            {job.description && (
                                                <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                                    <span className="font-semibold">Treatment:</span> {job.description}
                                                </div>
                                            )}

                                            {/* Products Used */}
                                            {job.products.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Products Used</p>
                                                    <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                                                        {job.products.map(p => (
                                                            <li key={p.id}>
                                                                {p.product.name} - {p.quantity} {p.product.unit}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic">No job history found.</p>
                            )}
                        </div>
                    </div>

                    {/* Payment History */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">{t.paymentHistory}</h3>
                        </div>
                        <div className="px-4 py-5 sm:p-6">
                            {paidInvoices.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {paidInvoices.map(invoice => (
                                        <li key={invoice.id} className="py-4 flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {t.invoice} #{invoice.id.slice(0, 8)}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {format(new Date(invoice.createdAt), 'MMM d, yyyy', { locale: dateLocale })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900">${invoice.total.toFixed(2)}</p>
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    {t.paid}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic">{t.noPaymentHistory}</p>
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
