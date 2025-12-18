"use client";

import { useState } from "react";
import { Client, Property, Job, ClientNote, Quote, Invoice, Product } from "@prisma/client";
import { PropertyList } from "@/components/properties/property-list";
import { ClientNotes } from "./client-notes";
import { ClientQuotes } from "./client-quotes";
import { ClientInvoices } from "./client-invoices";
import Link from "next/link";
import { format } from "date-fns";

type ClientWithRelations = Client & {
    properties: Property[];
};

interface ClientTabsProps {
    client: ClientWithRelations;
    jobs: (Job & { property: Property })[];
    notes: ClientNote[];
    quotes: any[]; // TODO: Type properly with relations
    invoices: any[]; // TODO: Type properly with relations
    products: Product[];
}

export function ClientTabs({ client, jobs, notes, quotes, invoices, products }: ClientTabsProps) {
    const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "notes" | "quotes" | "invoices">("overview");

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "jobs", label: `Jobs (${jobs.length})` },
        { id: "notes", label: `Notes (${notes.length})` },
        { id: "quotes", label: `Quotes (${quotes.length})` },
        { id: "invoices", label: `Invoices (${invoices.length})` },
    ];

    return (
        <div>
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                                ${activeTab === tab.id
                                    ? "border-indigo-500 text-indigo-600"
                                    : "border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300"}
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="min-h-[400px]">
                {activeTab === "overview" && (
                    <div className="space-y-8">
                        {/* Contact Info */}
                        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Contact Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase">Email</label>
                                    <p className="text-gray-900">{client.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase">Phone</label>
                                    <p className="text-gray-900">{client.phone || 'N/A'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-gray-500 uppercase">Billing Address</label>
                                    <p className="text-gray-900 whitespace-pre-wrap">{client.billingAddress || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Properties */}
                        <PropertyList properties={client.properties} clientId={client.id} />
                    </div>
                )}

                {activeTab === "jobs" && (
                    <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">Job History</h2>
                            <Link
                                href={`/jobs/new?clientId=${client.id}`}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                + New Job
                            </Link>
                        </div>
                        <ul className="divide-y divide-gray-200">
                            {jobs.map((job) => (
                                <li key={job.id} className="hover:bg-gray-50">
                                    <Link href={`/jobs/${job.id}`} className="block px-6 py-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                                                        ${job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                            job.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                                                                job.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-gray-100 text-gray-800'}`}>
                                                        {job.status}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {format(new Date(job.scheduledAt), "PPP")}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">{job.description || 'No description'}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{job.property.address}</p>
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                View &rarr;
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                            {jobs.length === 0 && (
                                <li className="px-6 py-8 text-center text-gray-500 text-sm">
                                    No jobs found.
                                </li>
                            )}
                        </ul>
                    </div>
                )}

                {activeTab === "notes" && (
                    <ClientNotes clientId={client.id} notes={notes} />
                )}

                {activeTab === "quotes" && (
                    <ClientQuotes clientId={client.id} quotes={quotes} products={products} />
                )}

                {activeTab === "invoices" && (
                    <ClientInvoices clientId={client.id} invoices={invoices} products={products} />
                )}
            </div>
        </div>
    );
}
