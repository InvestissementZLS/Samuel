import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { JobDetailsPanel } from "./job-details-panel";
import { Job, Property, Client, User, Invoice } from "@prisma/client";
import { ChevronRight, ChevronLeft, Briefcase, Clock, Calendar as CalendarIcon } from "lucide-react";

type JobWithDetails = Job & {
    property: Property & {
        client: Client;
    };
    technicians: User[];
    invoices: Invoice[];
    activities: (any & { user: User | null })[];
};

interface CalendarSidebarProps {
    date: Date;
    setDate: (date: Date) => void;
    selectedJob: JobWithDetails | null;
    onCloseJobDetails: () => void;
    unassignedJobs: JobWithDetails[];
    jobs: JobWithDetails[];
}

export function CalendarSidebar({ date, setDate, selectedJob, onCloseJobDetails, unassignedJobs, jobs }: CalendarSidebarProps) {
    const [activeTab, setActiveTab] = useState<'calendar' | 'workpool'>('calendar');

    if (selectedJob) {
        return <JobDetailsPanel job={selectedJob} onClose={onCloseJobDetails} />;
    }

    const dailyJobs = jobs.filter(job => {
        const jobDate = new Date(job.scheduledAt);
        return (
            jobDate.getDate() === date.getDate() &&
            jobDate.getMonth() === date.getMonth() &&
            jobDate.getFullYear() === date.getFullYear()
        );
    });

    const scheduledCount = dailyJobs.length;
    const completedCount = dailyJobs.filter(job => job.status === 'COMPLETED').length;

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-gray-300 border-l border-gray-800 w-[250px]">
            {/* Tabs / Header */}
            <div className="flex border-b border-gray-800">
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors
                        ${activeTab === 'calendar' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    <CalendarIcon className="w-4 h-4" />
                    Calendar
                </button>
                <button
                    onClick={() => setActiveTab('workpool')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors
                        ${activeTab === 'workpool' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    <Briefcase className="w-4 h-4" />
                    Work Pool
                    {unassignedJobs.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{unassignedJobs.length}</span>
                    )}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'calendar' && (
                    <div className="space-y-6">
                        {/* Mini Calendar */}
                        <div className="bg-gray-800/30 rounded-lg p-2">
                            <style>{`
                                .rdp { --rdp-cell-size: 28px; --rdp-accent-color: #4f46e5; margin: 0; }
                                .rdp-day_selected:not([disabled]) { background-color: var(--rdp-accent-color); }
                                .rdp-caption_label { color: #e5e7eb; font-weight: 600; }
                                .rdp-head_cell { color: #9ca3af; font-size: 0.75rem; }
                                .rdp-day { color: #d1d5db; font-size: 0.875rem; }
                                .rdp-day:hover:not([disabled]) { background-color: #374151; }
                                .rdp-button:hover:not([disabled]) { background-color: #374151; }
                            `}</style>
                            <DayPicker
                                mode="single"
                                selected={date}
                                onSelect={(d) => d && setDate(d)}
                                showOutsideDays
                                fixedWeeks
                            />
                        </div>

                        {/* Stats / Info */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Overview</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                                    <span className="block text-2xl font-bold text-white">{scheduledCount}</span>
                                    <span className="text-xs text-gray-400">Scheduled Jobs</span>
                                </div>
                                <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                                    <span className="block text-2xl font-bold text-green-400">{completedCount}</span>
                                    <span className="text-xs text-gray-400">Completed</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'workpool' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-medium text-white">Unassigned Jobs</h3>
                            <span className="text-xs text-gray-500">{unassignedJobs.length} items</span>
                        </div>

                        <div className="space-y-2">
                            {unassignedJobs.map(job => (
                                <div key={job.id} className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-gray-600 cursor-grab active:cursor-grabbing">
                                    <div className="flex justify-between items-start mb-1">
                                        <Link
                                            href={`/clients/${job.property.clientId}`}
                                            className="font-medium text-white text-sm hover:text-indigo-400 hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {job.property.client.name}
                                        </Link>
                                        <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                                            {job.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-2 truncate">{job.property.address}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        <span>{format(new Date(job.scheduledAt), 'MMM d')}</span>
                                    </div>
                                </div>
                            ))}
                            {unassignedJobs.length === 0 && (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    No unassigned jobs.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
