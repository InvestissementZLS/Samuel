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
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { useLanguage } from "@/components/providers/language-provider";
import { useDivision } from "@/components/providers/division-provider";

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
    const { t } = useLanguage();
    const { division } = useDivision();

    const [view, setView] = useState<View>(Views.MONTH);
    const [date, setDate] = useState(new Date());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);
    const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);

    // Filters
    const [selectedTechId, setSelectedTechId] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [isMobile, setIsMobile] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // Default Sidebar visibility based on screen size
            if (mobile) {
                setShowSidebar(false);
            } else {
                setShowSidebar(true);
            }

            // Force Agenda view on mobile start if not already set
            if (mobile && view !== Views.AGENDA && view !== Views.DAY) {
                setView(Views.AGENDA);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const filteredJobs = jobs.filter((job) => {
        const techMatch = selectedTechId === "all" || job.technicians.some(t => t.id === selectedTechId) || (selectedTechId === "" && job.technicians.length === 0);
        const statusMatch = selectedStatus === "all" || job.status === selectedStatus;

        // Division Isolation
        // @ts-ignore
        const jobDivision = job.division || "EXTERMINATION";
        const divisionMatch = jobDivision === division;

        return techMatch && statusMatch && divisionMatch;
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

    const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
        if (action === 'TODAY') {
            setDate(new Date());
            return;
        }

        switch (view) {
            case Views.MONTH:
                setDate(action === 'NEXT' ? addMonths(date, 1) : subMonths(date, 1));
                break;
            case Views.WEEK:
                setDate(action === 'NEXT' ? addWeeks(date, 1) : subWeeks(date, 1));
                break;
            case Views.DAY:
                setDate(action === 'NEXT' ? addDays(date, 1) : subDays(date, 1));
                break;
        }
    };

    const eventPropGetter = (event: any) => {
        const job = event.resource as Job;
        let className = "";

        switch (job.status) {
            case "SCHEDULED":
                // Green (Confirm)
                className = "bg-green-100 border-green-300 text-green-800";
                break;
            case "PENDING":
                // Gray (Unconfirm)
                className = "bg-gray-100 border-gray-300 text-gray-800";
                break;
            case "CANCELLED":
                // Orange (Cancel)
                className = "bg-orange-100 border-orange-300 text-orange-800";
                break;
            case "IN_PROGRESS":
                // Yellow (Reschedule/In Progress)
                className = "bg-yellow-100 border-yellow-300 text-yellow-800";
                break;
            case "COMPLETED":
                // Blue (Completed)
                className = "bg-blue-100 border-blue-300 text-blue-800";
                break;
            default:
                className = "bg-blue-50 border-blue-200 text-blue-700";
        }

        return { className };
    };

    useEffect(() => {
        console.log("CalendarView jobs:", jobs);
        console.log("CalendarView events:", events);
    }, [jobs, events]);

    return (
        <div className="h-screen flex flex-col bg-white text-gray-900">
            {/* Toolbar */}
            {/* Toolbar */}
            <div className="p-4 border-b flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 w-full xl:w-auto">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-black min-w-[120px]">{t.calendar.title}</h2>
                        <div className="flex items-center border rounded-md bg-white shadow-sm">
                            <button
                                onClick={() => handleNavigate('PREV')}
                                className="px-3 py-1.5 hover:bg-gray-50 text-gray-700 border-r"
                                title={t.calendar.prev}
                            >
                                &lt;
                            </button>
                            <button
                                onClick={() => handleNavigate('TODAY')}
                                className="px-3 py-1.5 hover:bg-gray-50 text-gray-700 text-sm font-medium border-r"
                            >
                                {t.calendar.today}
                            </button>
                            <button
                                onClick={() => handleNavigate('NEXT')}
                                className="px-3 py-1.5 hover:bg-gray-50 text-gray-700"
                                title={t.calendar.next}
                            >
                                &gt;
                            </button>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 min-w-[180px] hidden sm:block">
                            {format(date, 'MMMM yyyy')}
                        </h3>

                        {/* Mobile Sidebar Toggle */}
                        {isMobile && (
                            <button
                                onClick={() => setShowSidebar(!showSidebar)}
                                className={`px-2 py-1.5 rounded-md border ${showSidebar ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-700'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M15 3v18" /></svg>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg overflow-x-auto max-w-full">
                        <button
                            onClick={() => setView(Views.MONTH)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${view === Views.MONTH ? 'bg-white shadow text-black' : 'text-gray-600 hover:text-black'}`}
                        >
                            {t.calendar.month}
                        </button>
                        {!isMobile && (
                            <button
                                onClick={() => setView(Views.WEEK)}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${view === Views.WEEK ? 'bg-white shadow text-black' : 'text-gray-600 hover:text-black'}`}
                            >
                                {t.calendar.week}
                            </button>
                        )}
                        <button
                            onClick={() => setView(Views.DAY)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${view === Views.DAY ? 'bg-white shadow text-black' : 'text-gray-600 hover:text-black'}`}
                        >
                            {t.calendar.day}
                        </button>
                        <button
                            onClick={() => setView(Views.AGENDA)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${view === Views.AGENDA ? 'bg-white shadow text-black' : 'text-gray-600 hover:text-black'}`}
                        >
                            List
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                    <select
                        value={selectedTechId}
                        onChange={(e) => setSelectedTechId(e.target.value)}
                        className="border rounded-md px-3 py-1.5 text-sm bg-white text-gray-900 w-full sm:w-auto"
                    >
                        <option value="all">All Technicians</option>
                        {technicians.map(tech => (
                            <option key={tech.id} value={tech.id}>{tech.name}</option>
                        ))}
                    </select>

                    <div className="flex gap-2">
                        <button
                            onClick={handleOptimize}
                            className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                            Optimize
                        </button>

                        <button
                            onClick={() => {
                                setSelectedJob(null);
                                setInitialDate(new Date());
                                setIsDialogOpen(true);
                            }}
                            className="flex-1 sm:flex-none px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors whitespace-nowrap"
                        >
                            + New Job
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                <style jsx global>{`
                    .rbc-calendar { color: #000000 !important; }
                    .rbc-header { color: #000000 !important; font-weight: 600; }
                    .rbc-off-range-bg { background-color: #f9fafb !important; }
                    .rbc-off-range { color: #9ca3af !important; }
                    .rbc-today { background-color: #f3f4f6 !important; }
                    .rbc-event { border-radius: 4px; }
                `}</style>
                <div className="flex-1 relative">
                    <DnDCalendar
                        toolbar={false}
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
                        eventPropGetter={eventPropGetter}
                        resources={!isMobile && (view === Views.DAY) ? [
                            { id: "unassigned", title: "Unassigned" },
                            ...(selectedTechId === "all" ? technicians : technicians.filter(t => t.id === selectedTechId)).map(t => ({ id: t.id, title: t.name }))
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
                {showSidebar && (
                    <div className={`${isMobile ? 'absolute inset-0 z-10 bg-white' : ''} h-full`}>
                        <CalendarSidebar
                            date={date}
                            setDate={(d) => {
                                setDate(d);
                                if (isMobile) setShowSidebar(false); // Close on select
                            }}
                            selectedJob={selectedJob}
                            onCloseJobDetails={() => setSelectedJob(null)}
                            unassignedJobs={unassignedJobs}
                            jobs={filteredJobs}
                        />
                        {isMobile && (
                            <button
                                onClick={() => setShowSidebar(false)}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        )}
                    </div>
                )}
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
