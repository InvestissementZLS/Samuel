'use client';

import { useLanguage } from '@/components/providers/language-provider';
import { format } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { Clock, ShieldCheck, AlertTriangle, Calendar } from 'lucide-react';
import Link from 'next/link';

interface RecurringViewProps {
    activeTreatments: any[];
    renewalCandidates: any[];
    backlogJobs: any[];
    safetyAlerts: any[];
}

export function RecurringView({ activeTreatments, renewalCandidates, backlogJobs, safetyAlerts }: RecurringViewProps) {
    const { t, language } = useLanguage();
    const dateLocale = language === 'FR' ? fr : enUS;

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">{t.recurring.title}</h1>

            {/* Safety Alerts - High Priority */}
            {safetyAlerts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 items-start">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="text-lg font-medium text-red-800">{t.recurring.safetyAlertTitle}</h3>
                        <p className="text-sm text-red-700 mt-1 mb-3">
                            {t.recurring.safetyAlertDesc}
                        </p>
                        <ul className="space-y-2">
                            {safetyAlerts.map((job: any) => (
                                <li key={job.id} className="flex justify-between bg-white/50 p-2 rounded text-sm text-red-900">
                                    <span>{job.property.client.name} - {job.description}</span>
                                    <span className="font-bold">{format(job.scheduledAt, 'MMM yyyy', { locale: dateLocale })}</span>
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
                            {t.recurring.activeTreatments}
                        </h2>
                        <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded-full">
                            {t.recurring.activeCount.replace('{count}', activeTreatments.length.toString())}
                        </span>
                    </div>
                    <div className="p-0">
                        {activeTreatments.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                {t.recurring.noActiveTreatments}
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.recurring.client}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.recurring.service}</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.recurring.nextVisit}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {activeTreatments.map((tItem: any) => (
                                        <tr key={tItem.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tItem.clientName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tItem.serviceName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                                <Link href={`/jobs/${tItem.id}`} className="text-indigo-600 hover:text-indigo-900">
                                                    {tItem.nextVisit ? format(tItem.nextVisit, 'd MMM', { locale: dateLocale }) : t.recurring.scheduled}
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
                            {t.recurring.seasonalBacklog}
                        </h2>
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                            {t.recurring.pendingCount.replace('{count}', backlogJobs.length.toString())}
                        </span>
                    </div>
                    <div className="p-0">
                        {backlogJobs.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                {t.recurring.noBacklog}
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200 h-64 overflow-y-auto">
                                {backlogJobs.map((job: any) => (
                                    <li key={job.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                                        <div>
                                            <div className="font-medium text-gray-900">{job.property.client.name}</div>
                                            <div className="text-xs text-blue-600 font-medium bg-blue-50 inline-block px-1 rounded">
                                                {t.recurring.due} {format(job.scheduledAt, 'MMMM yyyy', { locale: dateLocale })}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {job.description}
                                            </div>
                                        </div>
                                        <Link href={`/jobs/${job.id}`} className="text-sm border border-blue-200 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-50">
                                            {t.recurring.schedule}
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
                            {t.recurring.annualRenewals}
                        </h2>
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                            {t.recurring.dueCount.replace('{count}', renewalCandidates.length.toString())}
                        </span>
                    </div>
                    <div className="p-0 h-64 overflow-y-auto">
                        <ul className="divide-y divide-gray-200">
                            {renewalCandidates.map((job: any) => (
                                <li key={job.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                                    <div>
                                        <div className="font-medium text-gray-900">{job.property.client.name}</div>
                                        <div className="text-sm text-gray-500">
                                            {t.recurring.lastVisit} {format(job.scheduledAt, 'MMM yyyy', { locale: dateLocale })}
                                        </div>
                                    </div>
                                    <button className="text-sm bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-md hover:bg-green-100">
                                        {t.recurring.renew}
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
