import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { JobDetailsPanel } from "./job-details-panel";
import { Job, Property, Client, User, Invoice } from "@prisma/client";
import { Clock, Briefcase, CalendarDays } from "lucide-react";

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
        <div className="h-full flex flex-col bg-[#1a1a1a] text-gray-300 border-l border-gray-800 w-full overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-800 flex-shrink-0">
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors
                        ${activeTab === 'calendar' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    <CalendarDays className="w-3.5 h-3.5" />
                    Mini Cal
                </button>
                <button
                    onClick={() => setActiveTab('workpool')}
                    className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors
                        ${activeTab === 'workpool' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    <Briefcase className="w-3.5 h-3.5" />
                    Work Pool
                    {unassignedJobs.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full leading-4">
                            {unassignedJobs.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3">
                {activeTab === 'calendar' && (
                    <div className="space-y-4">
                        {/* Mini Calendar */}
                        <div className="bg-gray-800/30 rounded-lg p-1.5">
                            <style>{`
                                .rdp { --rdp-cell-size: 26px; --rdp-accent-color: #4f46e5; margin: 0; }
                                .rdp-day_selected:not([disabled]) { background-color: var(--rdp-accent-color); }
                                .rdp-caption_label { color: #e5e7eb; font-weight: 600; font-size: 0.8rem; }
                                .rdp-head_cell { color: #9ca3af; font-size: 0.7rem; }
                                .rdp-day { color: #d1d5db; font-size: 0.8rem; }
                                .rdp-day:hover:not([disabled]) { background-color: #374151; }
                                .rdp-button:hover:not([disabled]) { background-color: #374151; }
                                .rdp-nav_button { color: #9ca3af; }
                            `}</style>
                            <DayPicker
                                mode="single"
                                selected={date}
                                onSelect={(d) => d && setDate(d)}
                                showOutsideDays
                                fixedWeeks
                            />
                        </div>

                        {/* Daily stats */}
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">
                                {format(date, 'EEEE, MMM d')}
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50">
                                    <span className="block text-xl font-bold text-white">{scheduledCount}</span>
                                    <span className="text-[11px] text-gray-400">Scheduled</span>
                                </div>
                                <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50">
                                    <span className="block text-xl font-bold text-green-400">{completedCount}</span>
                                    <span className="text-[11px] text-gray-400">Completed</span>
                                </div>
                            </div>
                        </div>

                        {/* Jobs for selected day */}
                        {dailyJobs.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Jobs</h3>
                                {dailyJobs.map(job => (
                                    <div key={job.id} className="bg-gray-800/60 p-2.5 rounded-lg border border-gray-700/50 text-xs">
                                        <div className="font-medium text-white truncate">{job.property.client.name}</div>
                                        <div className="text-gray-400 truncate mt-0.5">{job.property.address}</div>
                                        <div className="flex items-center gap-1 mt-1.5">
                                            <Clock className="w-3 h-3 text-gray-500" />
                                            <span className="text-gray-400">{format(new Date(job.scheduledAt), 'HH:mm')}</span>
                                            <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium ${job.status === 'COMPLETED' ? 'bg-blue-900/50 text-blue-300' :
                                                    job.status === 'IN_PROGRESS' ? 'bg-yellow-900/50 text-yellow-300' :
                                                        job.status === 'SCHEDULED' ? 'bg-green-900/50 text-green-300' :
                                                            'bg-gray-700 text-gray-300'
                                                }`}>
                                                {job.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'workpool' && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-semibold text-white">Unassigned Jobs</h3>
                            <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{unassignedJobs.length}</span>
                        </div>

                        <div className="space-y-2">
                            {unassignedJobs.map(job => (
                                <div key={job.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-indigo-500/50 transition-colors cursor-grab active:cursor-grabbing">
                                    <div className="flex justify-between items-start mb-1.5">
                                        <Link
                                            href={`/clients/${job.property.clientId}`}
                                            className="font-medium text-white text-xs hover:text-indigo-400 hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {job.property.client.name}
                                        </Link>
                                        <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-300 ml-2 flex-shrink-0">
                                            {job.status}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mb-1.5 truncate">{job.property.address}</p>
                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        <span>{format(new Date(job.scheduledAt), 'MMM d, HH:mm')}</span>
                                    </div>
                                </div>
                            ))}

                            {unassignedJobs.length === 0 && (
                                <div className="text-center py-10 text-gray-500">
                                    <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs">No unassigned jobs</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
