import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { JobStatusSelect } from '@/components/jobs/job-status-select';
import { JobNotes } from '@/components/jobs/job-notes';
import { JobPhotos } from '@/components/jobs/job-photos';
import { JobProducts } from '@/components/jobs/job-products';
import { JobBilling } from '@/components/jobs/job-billing';

import { JobTechnicianSelect } from '@/components/jobs/job-technician-select';
import { JobActions } from '@/components/jobs/job-actions';
import { JobFinancials } from '@/components/jobs/job-financials';
import { JobScheduleEdit } from '@/components/jobs/job-schedule-edit';

import { cookies } from 'next/headers';
import { dictionary } from '@/lib/i18n/dictionary';

export default async function JobDetailsPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const cookieStore = cookies();
    const lang = cookieStore.get("NEXT_LOCALE")?.value || "en";
    const t = dictionary[lang as keyof typeof dictionary] || dictionary.en;

    const job = await prisma.job.findUnique({
        where: { id },
        include: {
            property: {
                include: {
                    client: true,
                },
            },
            technicians: true,
            notes: {
                orderBy: { createdAt: 'desc' },
            },
            photos: {
                orderBy: { createdAt: 'desc' },
            },
            products: {
                include: {
                    product: true,
                    locations: true,
                    pests: true,
                    methods: true,
                },
            },
            invoices: {
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            },
        },
    });

    if (!job) {
        notFound();
    }

    const availableProducts = await prisma.product.findMany({
        orderBy: { name: 'asc' },
    });

    const allTechnicians = await prisma.user.findMany({
        where: { role: 'TECHNICIAN' },
        orderBy: { name: 'asc' },
    });

    return (
        <div className="max-w-5xl mx-auto p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <h1 className="text-3xl font-bold text-gray-900">{t.jobDetails.title}</h1>
                        <JobStatusSelect jobId={job.id} currentStatus={job.status} />
                    </div>
                    <p className="text-gray-500">Job ID: {job.id}</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/calendar"
                        className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
                    >
                        {t.jobDetails.backToCalendar}
                    </Link>
                    <JobActions jobId={job.id} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Info */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Client & Property */}
                    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold mb-4 border-b pb-2">{t.jobDetails.locationClient}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase">{t.jobDetails.client}</label>
                                <Link href={`/clients/${job.property.clientId}`} className="text-blue-600 hover:underline">
                                    {job.property.client.name}
                                </Link>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase">{t.jobDetails.property}</label>
                                <p className="text-gray-900">{job.property.address}</p>
                                <p className="text-xs text-gray-500">{job.property.type}</p>
                            </div>
                            {job.property.accessInfo && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase">{t.jobDetails.accessInfo}</label>
                                    <p className="text-gray-900 bg-yellow-50 p-2 rounded text-sm border border-yellow-100">
                                        {job.property.accessInfo}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Schedule & Tech */}
                    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold mb-4 border-b pb-2">{t.jobDetails.schedule}</h2>
                        <div className="space-y-4">
                            <div>
                                <JobScheduleEdit
                                    jobId={job.id}
                                    initialScheduledAt={job.scheduledAt}
                                    initialScheduledEndAt={job.scheduledEndAt}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase">{t.jobDetails.technician}</label>
                                <p className="text-gray-900">
                                    <JobTechnicianSelect
                                        jobId={job.id}
                                        assignedTechnicians={job.technicians}
                                        allTechnicians={allTechnicians}
                                    />
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase">{t.jobDetails.description}</label>
                                <p className="text-gray-900 text-sm">{job.description || t.jobDetails.noDescription}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Work Details */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Notes */}
                    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                        <JobNotes jobId={job.id} notes={job.notes} />
                    </div>

                    {/* Photos */}
                    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                        <JobPhotos jobId={job.id} photos={job.photos} />
                    </div>

                    {/* Financials */}
                    <JobFinancials job={job} />

                    {/* Billing (Services) */}
                    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                        <JobBilling
                            jobId={job.id}
                            invoices={job.invoices}
                            // @ts-ignore - Prisma Client types stale
                            availableServices={availableProducts.filter((p: any) => p.type === 'SERVICE')}
                        />
                    </div>

                    {/* Consumption (Materials) */}
                    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                        <JobProducts
                            jobId={job.id}
                            usedProducts={job.products}
                            availableProducts={availableProducts}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
