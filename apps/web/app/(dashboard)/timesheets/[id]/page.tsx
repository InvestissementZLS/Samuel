import { prisma } from "@/lib/prisma";
import { format, startOfDay, endOfDay } from "date-fns";
import { notFound } from "next/navigation";
import Link from 'next/link';
import { analyzeTechnicianMovement } from "@/lib/gps-analysis";
import { AlertTriangle } from "lucide-react";

export default async function TimesheetDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const entry = await prisma.timesheetEntry.findUnique({
        where: { id: params.id },
        include: {
            user: true,
            breadcrumbs: {
                orderBy: { timestamp: 'asc' }
            }
        }
    });

    if (!entry) {
        notFound();
    }

    // GET AUTHORIZED LOCATIONS (Jobs assigned to this user on this day)
    const jobs = await prisma.job.findMany({
        where: {
            technicians: { some: { id: entry.userId } },
            scheduledAt: {
                gte: startOfDay(entry.startTime),
                lte: endOfDay(entry.startTime)
            }
        },
        include: { property: true }
    });

    const authorizedLocations = jobs
        .filter(j => j.property.latitude && j.property.longitude)
        .map(j => ({
            lat: j.property.latitude!,
            lng: j.property.longitude!
        }));

    // Safely access fields
    const startKm = (entry as any).startKm;
    const endKm = (entry as any).endKm;
    const startPhotoId = (entry as any).startOdometerPhotoId;
    const endPhotoId = (entry as any).endOdometerPhotoId;

    // Parse Locations "lat,lng"
    const parseLoc = (locStr: string | null) => {
        if (!locStr) return null;
        const [lat, lng] = locStr.split(',').map(Number);
        return (lat && lng) ? { lat, lng } : null;
    };

    const startLocObj = parseLoc((entry as any).startLocation);
    const endLocObj = parseLoc((entry as any).endLocation);

    // Run Analysis
    const analysis = analyzeTechnicianMovement(
        entry.startTime,
        entry.endTime,
        startLocObj,
        endLocObj,
        (entry as any).breadcrumbs || []
    );

    // Helper to check if a specific timestamp falls within an unscheduled stop
    const isAnomalyTime = (timestamp: Date | string) => {
        if (!analysis.unscheduledStops?.detected) return false;
        const time = new Date(timestamp).getTime();
        return analysis.unscheduledStops.stops.some(stop => {
            const start = new Date(stop.startTime).getTime();
            // Add buffer? Exact match might be tricky with minutes, but let's trust the duration
            const end = start + (stop.durationMinutes * 60 * 1000);
            return time >= start && time <= end;
        });
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Timesheet Details</h1>
                    <p className="text-muted-foreground">
                        {entry.user.name || entry.user.email} - {format(new Date(entry.startTime), "PPP")}
                    </p>
                </div>
                <Link href="/timesheets" className="text-sm text-blue-600 hover:underline">
                    &larr; Back to List
                </Link>
            </div>

            {/* ANOMALY ALERTS */}
            {(analysis.lateStart?.detected || analysis.latePunchOut?.detected || analysis.unscheduledStops?.detected) && (
                <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3 w-full">
                            <h3 className="text-sm font-medium text-yellow-800">Potential Anomalies Detected</h3>

                            <div className="mt-2 text-sm text-yellow-700">
                                <ul role="list" className="list-disc space-y-1 pl-5">
                                    {analysis.lateStart?.detected && (
                                        <li>
                                            <strong>Late Start:</strong> {analysis.lateStart.message}
                                        </li>
                                    )}
                                    {analysis.latePunchOut?.detected && (
                                        <li>
                                            <strong>Late Punch Out:</strong> {analysis.latePunchOut.message}
                                        </li>
                                    )}
                                    {analysis.unscheduledStops?.detected && (
                                        <li>
                                            <strong>{analysis.unscheduledStops.stops.length} Unscheduled Stop(s)</strong> detected during the route.
                                        </li>
                                    )}
                                </ul>
                            </div>

                            {/* Collapsible Details for Unscheduled Stops */}
                            {analysis.unscheduledStops?.detected && (
                                <details className="mt-4 group">
                                    <summary className="cursor-pointer text-sm font-medium text-yellow-900 hover:text-yellow-800 focus:outline-none">
                                        View {analysis.unscheduledStops.stops.length} Unscheduled Stop(s) Details
                                    </summary>
                                    <div className="mt-3 overflow-hidden rounded-md border border-yellow-200">
                                        <table className="min-w-full divide-y divide-yellow-200 bg-yellow-50/50">
                                            <thead className="bg-yellow-100/50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">Start Time</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">Duration</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">Location</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-yellow-200">
                                                {analysis.unscheduledStops.stops.map((stop, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-3 py-2 text-sm text-yellow-900">{format(new Date(stop.startTime), "p")}</td>
                                                        <td className="px-3 py-2 text-sm text-yellow-900">{stop.durationMinutes} min</td>
                                                        <td className="px-3 py-2 text-sm text-yellow-900">
                                                            <a href={`https://www.google.com/maps/search/?api=1&query=${stop.location.lat},${stop.location.lng}`} target="_blank" className="underline hover:text-yellow-700">
                                                                Open Map
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                {/* General Info */}
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4">Summary</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-medium">{entry.status}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Start Time:</span>
                            <span className="font-medium">{format(new Date(entry.startTime), "pp")}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">End Time:</span>
                            <span className="font-medium">{entry.endTime ? format(new Date(entry.endTime), "pp") : "-"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-medium">
                                {entry.duration ? `${Math.floor(entry.duration / 60)}h ${entry.duration % 60}m` : "-"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Odometer Info */}
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4">Odometer & Travel</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Start</h3>
                                <p className="text-lg font-bold">{startKm ?? 0} KM</p>
                                {startPhotoId && (
                                    <div className="mt-2 text-xs text-blue-600 truncate">
                                        Photo ID: {startPhotoId}
                                        {/* In real app, render <img src={url} /> */}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">End</h3>
                                <p className="text-lg font-bold">{endKm ?? "-"} KM</p>
                                {endPhotoId && (
                                    <div className="mt-2 text-xs text-blue-600 truncate">
                                        Photo ID: {endPhotoId}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="pt-4 border-t">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Distance:</span>
                                <span className="font-bold text-xl">
                                    {(endKm && startKm) ? `${endKm - startKm} KM` : "-"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* GPS Trace Section */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold">GPS Tracking Trace</h2>
                    <p className="text-sm text-muted-foreground">
                        {/* Type cast breadcrumbs because Prisma types might be stale */}
                        {(entry as any).breadcrumbs?.length || 0} points recorded
                    </p>
                </div>
                <div className="p-0">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="h-10 px-4 text-left font-medium">Time</th>
                                <th className="h-10 px-4 text-left font-medium">Latitude</th>
                                <th className="h-10 px-4 text-left font-medium">Longitude</th>
                                <th className="h-10 px-4 text-left font-medium">Accuracy</th>
                                <th className="h-10 px-4 text-left font-medium">Map Link</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {((entry as any).breadcrumbs || []).map((crumb: any) => {
                                const isDanger = isAnomalyTime(crumb.timestamp);
                                return (
                                    <tr key={crumb.id} className={isDanger ? "bg-red-50 hover:bg-red-100" : "hover:bg-muted/50"}>
                                        <td className="p-4">
                                            {format(new Date(crumb.timestamp), "pp")}
                                            {isDanger && <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">STOP</span>}
                                        </td>
                                        <td className="p-4">{crumb.latitude.toFixed(6)}</td>
                                        <td className="p-4">{crumb.longitude.toFixed(6)}</td>
                                        <td className="p-4">±{crumb.accuracy ? Math.round(crumb.accuracy) : "?"}m</td>
                                        <td className="p-4">
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${crumb.latitude},${crumb.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:align-top"
                                            >
                                                View
                                            </a>
                                        </td>
                                    </tr>
                                )
                            })}
                            {((entry as any).breadcrumbs || []).length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                        No GPS data available for this trip.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
