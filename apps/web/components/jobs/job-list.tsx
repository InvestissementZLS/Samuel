"use client";

import { useDivision } from "@/components/providers/division-provider";
import { Job, Property, Client, User, Product, UsedProduct } from "@prisma/client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { JobFilters } from "./job-filters";
import { format } from "date-fns";

type JobWithDetails = Job & {
    property: Property & {
        client: Client;
    };
    technicians: User[];
    products: (UsedProduct & { product: Product })[];
};

interface JobListProps {
    jobs: JobWithDetails[];
    services?: Product[];
}

export function JobList({ jobs, services = [] }: JobListProps) {
    const { division } = useDivision();
    const [filteredData, setFilteredData] = useState<JobWithDetails[]>(jobs);

    // Extract unique technicians from the full job list for the filter dropdown
    const allTechnicians = jobs.reduce((acc, job) => {
        job.technicians.forEach(t => {
            if (!acc.some(exist => exist.id === t.id)) {
                acc.push(t);
            }
        });
        return acc;
    }, [] as User[]);

    // Apply division filter after the robust filters
    const displayedJobs = filteredData.filter(job => {
        // @ts-ignore
        const jobDivision = job.division || "EXTERMINATION";
        return jobDivision === division;
    });

    return (
        <div className="space-y-4">
            <JobFilters
                jobs={jobs}
                onFilterChange={setFilteredData}
                technicians={allTechnicians}
                services={services}
            />

            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-700">
                        {division === "EXTERMINATION" ? "Extermination" : "Entreprises"} Jobs ({displayedJobs.length})
                    </h2>
                </div>
                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-200">
                    {displayedJobs.map((job) => (
                        <div key={job.id} className="p-4 space-y-3">
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
                                    {job.status}
                                </span>
                            </div>

                            <div className="flex justify-between text-sm text-gray-600">
                                <div>
                                    <div className="font-medium">{format(new Date(job.scheduledAt), 'MMM dd, yyyy')}</div>
                                    <div>{format(new Date(job.scheduledAt), 'HH:mm')}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium">Technician</div>
                                    <div>
                                        {job.technicians.length > 0
                                            ? job.technicians.map(t => t.name).join(", ")
                                            : <span className="italic text-gray-400">Unassigned</span>
                                        }
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <Link
                                    href={`/jobs/${job.id}`}
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                                >
                                    View Details
                                </Link>
                                {job.status === 'COMPLETED' && (
                                    <button
                                        onClick={async () => {
                                            if (confirm("Create an invoice from this job?")) {
                                                const { convertJobToInvoice } = await import("@/app/actions/workflow-actions");
                                                await convertJobToInvoice(job.id);
                                            }
                                        }}
                                        className="text-sm font-medium text-green-600 hover:text-green-900"
                                    >
                                        Convert to Invoice
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop Table View */}
                <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Client / Property
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Technician
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {displayedJobs.map((job) => (
                            <tr key={job.id} className="hover:bg-gray-50">
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
                                        <span className="text-sm text-gray-400 italic">Unassigned</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${job.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                                            job.status === 'SCHEDULED' ? 'bg-green-100 text-green-800' :
                                                job.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                                    job.status === 'CANCELLED' ? 'bg-orange-100 text-orange-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                        {job.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <Link
                                        href={`/jobs/${job.id}`}
                                        className="text-indigo-600 hover:text-indigo-900"
                                    >
                                        View
                                    </Link>
                                    {job.status === 'COMPLETED' && (
                                        <button
                                            onClick={async () => {
                                                if (confirm("Create an invoice from this job?")) {
                                                    const { convertJobToInvoice } = await import("@/app/actions/workflow-actions");
                                                    await convertJobToInvoice(job.id);
                                                }
                                            }}
                                            className="ml-4 text-green-600 hover:text-green-900"
                                        >
                                            Convert to Invoice
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {displayedJobs.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        No jobs scheduled for this division.
                    </div>
                )}
            </div>
        </div>
    );
}
