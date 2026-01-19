import { getActiveTreatments } from "@/app/actions/recurring-actions";
import { format, startOfMonth } from "date-fns";
import { Clock, ShieldCheck, AlertTriangle, Calendar } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function RecurringServicesPage() {
    const activeTreatments = await getActiveTreatments();

    // Mock "Annual Renewals" - In real app, query jobs from exactly 1 year ago (-11 to -13 months window)
    const lastYearStart = new Date();
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
    lastYearStart.setMonth(lastYearStart.getMonth() - 1);

    const lastYearEnd = new Date();
    lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);
    lastYearEnd.setMonth(lastYearEnd.getMonth() + 1);

    const renewalCandidates = await prisma.job.findMany({
        where: {
            scheduledAt: {
                gte: lastYearStart,
                lte: lastYearEnd
            },
            status: 'COMPLETED',
            products: {
                some: {
                    product: {
                        name: { contains: 'Extérieur', mode: 'insensitive' } // Filter for exterior treatments
                    }
                }
            }
        },
        include: {
            property: { include: { client: true } },
            products: { include: { product: true } }
        },
        take: 10
    });

    // -- Backlog & Safety Logic --
    const currentMonth = new Date().getMonth() + 1;

    // Find Deferred Jobs (Backlog) - Pending Jobs that are "Included" (have parent) and are for this season
    const backlogJobs = await prisma.job.findMany({
        where: {
            status: 'PENDING',
            parentJobId: { not: null },
            scheduledAt: { gte: startOfMonth(new Date()) }, // Future or now
            description: { contains: 'Included Service' }
        },
        include: { property: { include: { client: true } }, products: { include: { product: true } } },
        orderBy: { scheduledAt: 'asc' }
    });

    // Find Safety Alerts - Included Jobs that should have been done but date passed (or close to end of season)
    // Simplified: Pending tasks older than today? Or specifically late in season.
    // Let's grab Pending tasks that align with "Season End" logic if possible, or just overdue Pending.
    const safetyAlerts = await prisma.job.findMany({
        where: {
            status: 'PENDING',
            parentJobId: { not: null },
            scheduledAt: { lt: new Date() }, // Overdue
            description: { contains: 'Included Service' } // specific to deferred
        },
        include: { property: { include: { client: true } }, products: { include: { product: true } } }
    });

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">Recurring Services & Warranties</h1>

            {/* Safety Alerts - High Priority */}
            {safetyAlerts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 items-start">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="text-lg font-medium text-red-800">Safety Alert: Services Not Completed</h3>
                        <p className="text-sm text-red-700 mt-1 mb-3">
                            The following clients paid for services (e.g. Annual Spray) that are OVERDUE and have not been completed.
                        </p>
                        <ul className="space-y-2">
                            {safetyAlerts.map(job => (
                                <li key={job.id} className="flex justify-between bg-white/50 p-2 rounded text-sm text-red-900">
                                    <span>{job.property.client.name} - {job.description}</span>
                                    <span className="font-bold">{format(job.scheduledAt, 'MMM yyyy')}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                {/* Active Treatments */}
                <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Clock className="h-5 w-5 text-indigo-600" />
                            Active Treatments (Curative)
                        </h2>
                        <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded-full">
                            {activeTreatments.length} Active
                        </span>
                    </div>
                    <div className="p-0">
                        {activeTreatments.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No active multi-visit treatments found.
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Next Visit</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {activeTreatments.map((t) => (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.clientName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.serviceName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                                <Link href={`/jobs/${t.id}`} className="text-indigo-600 hover:text-indigo-900">
                                                    {t.nextVisit ? format(t.nextVisit, 'd MMM') : 'Scheduled'}
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Spring Backlog / Deferred Services */}
                <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 bg-blue-50 flex justify-between items-center">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            Seasonal Backlog (Spring Start)
                        </h2>
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                            {backlogJobs.length} Pending
                        </span>
                    </div>
                    <div className="p-0">
                        {backlogJobs.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No deferred seasonal services waiting.
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200 h-64 overflow-y-auto">
                                {backlogJobs.map((job) => (
                                    <li key={job.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                                        <div>
                                            <div className="font-medium text-gray-900">{job.property.client.name}</div>
                                            <div className="text-xs text-blue-600 font-medium bg-blue-50 inline-block px-1 rounded">
                                                Due: {format(job.scheduledAt, 'MMMM yyyy')}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {job.description}
                                            </div>
                                        </div>
                                        <Link href={`/jobs/${job.id}`} className="text-sm border border-blue-200 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-50">
                                            Schedule
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Annual Renewals Due */}
                <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-green-600" />
                            Legacy Annual Renewals
                        </h2>
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                            {renewalCandidates.length} Due
                        </span>
                    </div>
                    <div className="p-0 h-64 overflow-y-auto">
                        <ul className="divide-y divide-gray-200">
                            {renewalCandidates.map((job) => (
                                <li key={job.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                                    <div>
                                        <div className="font-medium text-gray-900">{job.property.client.name}</div>
                                        <div className="text-sm text-gray-500">
                                            Last: {format(job.scheduledAt, 'MMM yyyy')}
                                        </div>
                                    </div>
                                    <button className="text-sm bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-md hover:bg-green-100">
                                        Renew
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
