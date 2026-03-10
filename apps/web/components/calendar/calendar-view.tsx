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
import { PanelRight, PanelRightClose, Plus, Zap, ChevronLeft, ChevronRight } from "lucide-react";

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

    const [view, setView] = useState<View>(Views.MONTH);
    const [date, setDate] = useState(new Date());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);
    const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);

    // Filters
    const [selectedTechId, setSelectedTechId] = useState<string>("all");
    const [isMobile, setIsMobile] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setShowSidebar(false);
                // Use Day view on mobile for better readability
                if (view === Views.MONTH || view === Views.WEEK) {
                    setView(Views.DAY);
                }
            } else {
                setShowSidebar(true);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const filteredJobs = jobs.filter((job) => {
        const techMatch = selectedTechId === "all" || job.technicians.some(t => t.id === selectedTechId) || (selectedTechId === "" && job.technicians.length === 0);
        return techMatch;
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
                    id: `${job.id}-${tech.id}`,
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
        if (isMobile) setShowSidebar(true);
    };

    const handleEventDrop = async ({ event, start, end, resourceId }: any) => {
        const job = event.resource as Job;
        const techId = resourceId === "unassigned" ? undefined : resourceId;
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
        if (action === 'TODAY') { setDate(new Date()); return; }
        switch (view) {
            case Views.MONTH: setDate(action === 'NEXT' ? addMonths(date, 1) : subMonths(date, 1)); break;
            case Views.WEEK: setDate(action === 'NEXT' ? addWeeks(date, 1) : subWeeks(date, 1)); break;
            case Views.DAY: setDate(action === 'NEXT' ? addDays(date, 1) : subDays(date, 1)); break;
        }
    };

    const eventPropGetter = (event: any) => {
        const job = event.resource as Job;
        let className = "";
        switch (job.status) {
            case "SCHEDULED": className = "bg-green-100 border-green-300 text-green-800"; break;
            case "PENDING": className = "bg-gray-100 border-gray-300 text-gray-800"; break;
            case "CANCELLED": className = "bg-orange-100 border-orange-300 text-orange-800"; break;
            case "IN_PROGRESS": className = "bg-yellow-100 border-yellow-300 text-yellow-800"; break;
            case "COMPLETED": className = "bg-blue-100 border-blue-300 text-blue-800"; break;
            default: className = "bg-blue-50 border-blue-200 text-blue-700";
        }
        return { className };
    };

    // Format the header date label based on view
    const dateLabel = (() => {
        switch (view) {
            case Views.DAY: return format(date, 'EEEE, MMM d yyyy');
            case Views.WEEK: return format(date, "'Week of' MMM d, yyyy");
            default: return format(date, 'MMMM yyyy');
        }
    })();

    return (
        <div className="h-screen flex flex-col bg-white text-gray-900 overflow-hidden">
            {/* ─── Toolbar ─── */}
            <div className="flex-shrink-0 border-b bg-white px-3 py-2 md:px-4 md:py-3">

                {/* Row 1: Title + nav + view switcher + sidebar toggle */}
                <div className="flex items-center gap-2 flex-wrap">

                    {/* Page title */}
                    <h2 className="text-lg md:text-2xl font-bold text-black mr-1 hidden sm:block">
                        {t.calendar.title}
                    </h2>

                    {/* Prev / Today / Next */}
                    <div className="flex items-center border rounded-md bg-white shadow-sm text-sm">
                        <button
                            onClick={() => handleNavigate('PREV')}
                            className="px-2.5 py-1.5 hover:bg-gray-50 text-gray-700 border-r"
                            aria-label="Previous"
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <button
                            onClick={() => handleNavigate('TODAY')}
                            className="px-2.5 py-1.5 hover:bg-gray-50 text-gray-700 font-medium border-r whitespace-nowrap"
                        >
                            {t.calendar.today}
                        </button>
                        <button
                            onClick={() => handleNavigate('NEXT')}
                            className="px-2.5 py-1.5 hover:bg-gray-50 text-gray-700"
                            aria-label="Next"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>

                    {/* Date label */}
                    <span className="text-sm md:text-base font-semibold text-gray-700 min-w-[130px]">
                        {dateLabel}
                    </span>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* View switcher */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setView(Views.MONTH)}
                            className={`px-2.5 py-1 rounded-md text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${view === Views.MONTH ? 'bg-white shadow text-black' : 'text-gray-600 hover:text-black'}`}
                        >
                            {t.calendar.month}
                        </button>
                        {!isMobile && (
                            <button
                                onClick={() => setView(Views.WEEK)}
                                className={`px-2.5 py-1 rounded-md text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${view === Views.WEEK ? 'bg-white shadow text-black' : 'text-gray-600 hover:text-black'}`}
                            >
                                {t.calendar.week}
                            </button>
                        )}
                        <button
                            onClick={() => setView(Views.DAY)}
                            className={`px-2.5 py-1 rounded-md text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${view === Views.DAY ? 'bg-white shadow text-black' : 'text-gray-600 hover:text-black'}`}
                        >
                            {t.calendar.day}
                        </button>
                        <button
                            onClick={() => setView(Views.AGENDA)}
                            className={`px-2.5 py-1 rounded-md text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${view === Views.AGENDA ? 'bg-white shadow text-black' : 'text-gray-600 hover:text-black'}`}
                        >
                            List
                        </button>
                    </div>

                    {/* Sidebar toggle (visible on all sizes) */}
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className={`p-1.5 rounded-md border transition-colors ${showSidebar ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900'}`}
                        title={showSidebar ? "Hide panel" : "Show panel"}
                    >
                        {showSidebar ? <PanelRightClose size={18} /> : <PanelRight size={18} />}
                    </button>
                </div>

                {/* Row 2: Filters + action buttons */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <select
                        value={selectedTechId}
                        onChange={(e) => setSelectedTechId(e.target.value)}
                        className="border rounded-md px-2.5 py-1.5 text-sm bg-white text-gray-900 flex-1 min-w-[140px] max-w-xs"
                    >
                        <option value="all">All Technicians</option>
                        {technicians.map(tech => (
                            <option key={tech.id} value={tech.id}>{tech.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleOptimize}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
                    >
                        <Zap size={14} />
                        <span className="hidden sm:inline">Optimize</span>
                    </button>

                    <button
                        onClick={() => { setSelectedJob(null); setInitialDate(new Date()); setIsDialogOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors whitespace-nowrap"
                    >
                        <Plus size={14} />
                        <span className="hidden sm:inline">New Job</span>
                    </button>
                </div>
            </div>

            {/* ─── Main Content: Calendar + Sidebar ─── */}
            <div className="flex-1 flex overflow-hidden relative">
                <style jsx global>{`
                    .rbc-calendar { color: #000000 !important; }
                    .rbc-header { color: #000000 !important; font-weight: 600; }
                    .rbc-off-range-bg { background-color: #f9fafb !important; }
                    .rbc-off-range { color: #9ca3af !important; }
                    .rbc-today { background-color: #eff6ff !important; }
                    .rbc-event { border-radius: 4px; }
                    .rbc-agenda-view table { width: 100%; }
                `}</style>

                {/* Calendar grid */}
                <div className="flex-1 min-w-0 overflow-hidden">
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

                {/* Sidebar — desktop: inline panel; mobile: slide-over overlay */}
                {showSidebar && (
                    <>
                        {/* Mobile overlay backdrop */}
                        {isMobile && (
                            <div
                                className="absolute inset-0 bg-black/40 z-20"
                                onClick={() => setShowSidebar(false)}
                            />
                        )}

                        {/* Sidebar panel */}
                        <div
                            className={`
                                flex-shrink-0 h-full z-30
                                ${isMobile
                                    ? 'absolute right-0 top-0 bottom-0 w-[85vw] max-w-[300px] shadow-2xl'
                                    : 'w-[240px] xl:w-[270px]'
                                }
                            `}
                        >
                            <CalendarSidebar
                                date={date}
                                setDate={(d) => {
                                    setDate(d);
                                    if (isMobile) setShowSidebar(false);
                                }}
                                selectedJob={selectedJob}
                                onCloseJobDetails={() => setSelectedJob(null)}
                                unassignedJobs={unassignedJobs}
                                jobs={filteredJobs}
                            />
                        </div>
                    </>
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
