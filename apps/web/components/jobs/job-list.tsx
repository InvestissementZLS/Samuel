"use client";

import { useDivision } from "@/components/providers/division-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { Job, Property, Client, User, Product, UsedProduct } from "@prisma/client";
import Link from "next/link";
import { useState, useEffect, useMemo, memo } from "react";
import { JobFilters } from "./job-filters";
import { format } from "date-fns";

type JobWithDetails = Job & {
    property: Property & {
        client: Client;
    };
    technicians: User[];
    products: (UsedProduct & { product: Product })[];
};

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface JobListProps {
    jobs: JobWithDetails[];
    services?: Product[];
    showHeader?: boolean;
    currentPage?: number;
    totalPages?: number;
    totalCount?: number;
}

export function JobList({ 
    jobs, 
    services = [], 
    showHeader = false,
    currentPage = 1,
    totalPages = 1,
    totalCount = 0
}: JobListProps) {
    const { t } = useLanguage();
    const { division } = useDivision();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [filteredData, setFilteredData] = useState<JobWithDetails[]>(jobs);

    // Sync state when jobs prop changes (pagination)
    useEffect(() => {
        setFilteredData(jobs);
    }, [jobs]);

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    // Extract unique technicians from the full job list for the filter dropdown
    const allTechnicians = useMemo(() => {
        return jobs.reduce((acc, job) => {
            job.technicians.forEach(t => {
                if (!acc.some(exist => exist.id === t.id)) {
                    acc.push(t);
                }
            });
            return acc;
        }, [] as User[]);
    }, [jobs]);

    // Apply division filter after the robust filters
    const displayedJobs = useMemo(() => {
        return filteredData.filter(job => {
            // @ts-ignore
            const jobDivision = job.division || "EXTERMINATION";
            return jobDivision === division;
        });
    }, [filteredData, division]);

    return (
        <div className="space-y-4">
            {showHeader && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t.jobs.title}</h1>
                    <Link
                        href="/jobs/new"
                        className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-center text-sm font-medium"
                    >
                        + {t.jobs.createWorkOrder}
                    </Link>
                </div>
            )}
            <JobFilters
                jobs={jobs}
                onFilterChange={setFilteredData}
                technicians={allTechnicians}
                services={services}
            />

            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-700">
                        {division === "EXTERMINATION" ? t.divisions.extermination : t.divisions.entreprises} {t.jobs.title} ({displayedJobs.length})
                    </h2>
                </div>
                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-200">
                    {displayedJobs.map((job) => (
                        <MobileJobCard key={job.id} job={job} t={t} />
                    ))}
                </div>

                {/* Desktop Table View */}
                <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t.jobs.date}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t.jobs.clientProperty}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t.jobs.technician}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t.jobs.status}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t.common.actions}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {displayedJobs.map((job) => (
                            <JobRow key={job.id} job={job} t={t} />
                        ))}
                    </tbody>
                </table>
                {displayedJobs.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        {t.jobs.noJobs}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow-sm">
                    {/* ... pagination UI ... */}
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing <span className="font-medium">{(currentPage - 1) * 50 + 1}</span> to{' '}
                                <span className="font-medium">{Math.min(currentPage * 50, totalCount)}</span> of{' '}
                                <span className="font-medium">{totalCount}</span> results
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Previous</span>
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => handlePageChange(i + 1)}
                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === i + 1
                                                ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Next</span>
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l4.5-4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const JobRow = memo(({ job, t }: { job: JobWithDetails; t: any }) => (
    <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm font-medium text-gray-900">
                {format(new Date(job.scheduledAt), 'MMM dd, yyyy')}
            </div>
            <div className="text-sm text-gray-500">
                {format(new Date(job.scheduledAt), 'HH:mm')}
            </div>
        </td>
        <td className="px-6 py-4">
            <div className="text-sm font-medium text-gray-900">
                {job.property.client.name}
            </div>
            <div className="text-sm text-gray-500">
                {job.property.address}
            </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
            {job.technicians.length > 0 ? (
                <span className="text-sm text-gray-900">
                    {job.technicians.map(t => t.name).join(", ")}
                </span>
            ) : (
                <span className="text-sm text-gray-400 italic">{t.jobs.unassigned}</span>
            )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                ${job.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                    job.status === 'SCHEDULED' ? 'bg-green-100 text-green-800' :
                        job.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                            job.status === 'CANCELLED' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'}`}>
                {/* @ts-ignore */}
                {t.jobs.statuses[job.status] || job.status}
            </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <Link
                href={`/jobs/${job.id}`}
                className="text-indigo-600 hover:text-indigo-900"
            >
                {t.common.view}
            </Link>
            {job.status === 'COMPLETED' && (
                <button
                    onClick={async () => {
                        if (confirm(t.jobs.convertConfirm)) {
                            const { convertJobToInvoice } = await import("@/app/actions/workflow-actions");
                            await convertJobToInvoice(job.id);
                        }
                    }}
                    className="ml-4 text-green-600 hover:text-green-900"
                >
                    {t.jobs.convertToInvoice}
                </button>
            )}
        </td>
    </tr>
));

const MobileJobCard = memo(({ job, t }: { job: JobWithDetails; t: any }) => (
    <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
            <div>
                <div className="font-medium text-gray-900">{job.property.client.name}</div>
                <div className="text-sm text-gray-500">{job.property.address}</div>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                ${job.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                    job.status === 'SCHEDULED' ? 'bg-green-100 text-green-800' :
                        job.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                            job.status === 'CANCELLED' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'}`}>
                {/* @ts-ignore */}
                {t.jobs.statuses[job.status] || job.status}
            </span>
        </div>

        <div className="flex justify-between text-sm text-gray-600">
            <div>
                <div className="font-medium">{format(new Date(job.scheduledAt), 'MMM dd, yyyy')}</div>
                <div>{format(new Date(job.scheduledAt), 'HH:mm')}</div>
            </div>
            <div className="text-right">
                <div className="font-medium">{t.jobs.technician}</div>
                <div>
                    {job.technicians.length > 0
                        ? job.technicians.map(t => t.name).join(", ")
                        : <span className="italic text-gray-400">{t.jobs.unassigned}</span>
                    }
                </div>
            </div>
        </div>

        <div className="pt-2 flex justify-end gap-3">
            <Link
                href={`/jobs/${job.id}`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
            >
                {t.jobs.viewDetails}
            </Link>
            {job.status === 'COMPLETED' && (
                <button
                    onClick={async () => {
                        if (confirm(t.jobs.convertConfirm)) {
                            const { convertJobToInvoice } = await import("@/app/actions/workflow-actions");
                            await convertJobToInvoice(job.id);
                        }
                    }}
                    className="text-sm font-medium text-green-600 hover:text-green-900"
                >
                    {t.jobs.convertToInvoice}
                </button>
            )}
        </div>
    </div>
));

JobRow.displayName = "JobRow";
MobileJobCard.displayName = "MobileJobCard";
