"use client";

import { Calendar, View, Views } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { useState, useEffect } from "react";
import { Job, Property, Client, User, Invoice } from "@prisma/client";
import { JobDialog } from "./job-dialog";
import { updateCalendarJob } from "@/app/actions/calendar-actions";
import { optimizeDailyRoute } from "@/app/actions/optimization-actions";
import { toast } from "sonner";
import { CalendarSidebar } from "./calendar-sidebar";
import { localizer } from "./localizer";

const DnDCalendar = withDragAndDrop(Calendar);

type JobWithDetails = Job & {
    property: Property & {
        client: Client;
    };
    technicians: User[];
    invoices: Invoice[];
    activities: (any & { user: User | null })[];
};

type ClientWithProperties = Client & { properties: Property[] };

interface CalendarViewProps {
    jobs: JobWithDetails[];
    clients: ClientWithProperties[];
    technicians: User[];
}

export function CalendarView({ jobs, clients, technicians }: CalendarViewProps) {
    const [view, setView] = useState<View>(Views.MONTH);
    const [date, setDate] = useState(new Date());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);
    const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);

    // Filters
    const [selectedTechId, setSelectedTechId] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");

    const filteredJobs = jobs.filter((job) => {
        const techMatch = selectedTechId === "all" || job.technicians.some(t => t.id === selectedTechId) || (selectedTechId === "" && job.technicians.length === 0);
        const statusMatch = selectedStatus === "all" || job.status === selectedStatus;
        return techMatch && statusMatch;
    });

    const unassignedJobs = jobs.filter(job => job.technicians.length === 0 && job.status !== 'COMPLETED' && job.status !== 'CANCELLED');

    const events = filteredJobs.flatMap((job) => {
        const jobEvents = [];

        if (job.technicians.length === 0) {
            jobEvents.push({
                id: job.id,
                title: `${job.property.client.name} - ${job.property.address}`,
                start: new Date(job.scheduledAt),
                end: job.scheduledEndAt
                    ? new Date(job.scheduledEndAt)
                    : new Date(new Date(job.scheduledAt).getTime() + 60 * 60 * 1000),
                resource: job,
                resourceId: "unassigned",
            });
        } else {
            job.technicians.forEach(tech => {
                jobEvents.push({
                    id: `${job.id}-${tech.id}`, // Unique ID for the event instance
                    title: `${job.property.client.name} - ${job.property.address}`,
                    start: new Date(job.scheduledAt),
                    end: job.scheduledEndAt
                        ? new Date(job.scheduledEndAt)
                        : new Date(new Date(job.scheduledAt).getTime() + 60 * 60 * 1000),
                    resource: job,
                    resourceId: tech.id,
                });
            });
        }
        return jobEvents;
    });

    const handleSelectSlot = ({ start }: { start: Date }) => {
        setSelectedJob(null);
        setInitialDate(start);
        setIsDialogOpen(true);
    };

    const handleSelectEvent = (event: any) => {
        setSelectedJob(event.resource);
        // Don't open dialog, sidebar will show details
    };

    const handleEventDrop = async ({ event, start, end, resourceId }: any) => {
        const job = event.resource as Job;
        const techId = resourceId === "unassigned" ? undefined : resourceId;

        // Optimistic update (optional, for now just reload)
        try {
            await updateCalendarJob(job.id, {
                scheduledAt: start,
                scheduledEndAt: end,
                technicianIds: techId ? [techId] : []
            });
            toast.success("Job updated");
        } catch (error) {
            toast.error("Failed to update job");
        }
    };

    const handleOptimize = async () => {
        if (selectedTechId === "all") {
            toast.error("Please select a technician to optimize");
            return;
        }

        const toastId = toast.loading("Optimizing route...");
        try {
            const result = await optimizeDailyRoute(date, selectedTechId);
            if (result.success) {
                toast.success(result.message, { id: toastId });
            } else {
                toast.error("Optimization failed", { id: toastId });
            }
        } catch (error) {
            toast.error("An error occurred", { id: toastId });
        }
    };

    useEffect(() => {
        console.log("CalendarView jobs:", jobs);
        console.log("CalendarView events:", events);
    }, [jobs, events]);

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Toolbar */}
            <div className="p-4 border-b flex justify-between items-center bg-white">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800">Calendar</h2>
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setView(Views.MONTH)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${view === Views.MONTH ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => setView(Views.WEEK)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${view === Views.WEEK ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => setView(Views.DAY)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${view === Views.DAY ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Day
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <select
                        value={selectedTechId}
                        onChange={(e) => setSelectedTechId(e.target.value)}
                        className="border rounded-md px-3 py-1.5 text-sm bg-white"
                    >
                        <option value="all">All Technicians</option>
                        {technicians.map(tech => (
                            <option key={tech.id} value={tech.id}>{tech.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleOptimize}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        Optimize Route
                    </button>

                    <button
                        onClick={() => {
                            setSelectedJob(null);
                            setInitialDate(new Date());
                            setIsDialogOpen(true);
                        }}
                        className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                        + New Job
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 relative">
                    <DnDCalendar
                        localizer={localizer}
                        events={events}
                        startAccessor={(event: any) => event.start}
                        endAccessor={(event: any) => event.end}
                        style={{ height: "100%" }}
                        view={view}
                        onView={setView}
                        date={date}
                        onNavigate={setDate}
                        selectable
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={handleSelectEvent}
                        onEventDrop={handleEventDrop}
                        resizable
                        draggableAccessor={() => true}
                        resources={view === Views.DAY ? [
                            { id: "unassigned", title: "Unassigned" },
                            ...technicians.map(t => ({ id: t.id, title: t.name }))
                        ] : undefined}
                        resourceIdAccessor={(resource: any) => resource.id}
                        resourceTitleAccessor={(resource: any) => resource.title}
                        components={{
                            event: ({ event }: any) => (
                                <div className="text-xs p-1 h-full w-full overflow-hidden">
                                    <div className="font-semibold truncate">{event.title}</div>
                                    {event.resource.technicians.length > 0 && (
                                        <div className="text-[10px] opacity-75 truncate">
                                            {event.resource.technicians.map((t: any) => t.name).join(", ")}
                                        </div>
                                    )}
                                </div>
                            )
                        }}
                    />
                </div>

                {/* Sidebar */}
                <CalendarSidebar
                    date={date}
                    setDate={setDate}
                    selectedJob={selectedJob}
                    onCloseJobDetails={() => setSelectedJob(null)}
                    unassignedJobs={unassignedJobs}
                    jobs={filteredJobs}
                />
            </div>

            <JobDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                initialDate={initialDate}
                job={selectedJob}
                technicians={technicians}
                clients={clients}
            />
        </div>
    );
}
