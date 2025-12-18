"use client";

import { TimesheetEntry, User } from "@prisma/client";
import { format } from "date-fns";
import { approveTimesheet } from "@/app/actions/timesheet-actions";
import { toast } from "sonner";
import { useState } from "react";

interface TimesheetListProps {
    initialTimesheets: (TimesheetEntry & { user: User })[];
}

export function TimesheetList({ initialTimesheets }: TimesheetListProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleApprove = async (id: string) => {
        setLoading(id);
        try {
            await approveTimesheet(id);
            toast.success("Timesheet approved");
        } catch (error) {
            toast.error("Failed to approve");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="rounded-md border">
            <table className="w-full text-sm">
                <thead className="bg-muted/50">
                    <tr className="border-b">
                        <th className="h-12 px-4 text-left font-medium">Technician</th>
                        <th className="h-12 px-4 text-left font-medium">Date</th>
                        <th className="h-12 px-4 text-left font-medium">Start</th>
                        <th className="h-12 px-4 text-left font-medium">End</th>
                        <th className="h-12 px-4 text-left font-medium">Duration</th>
                        <th className="h-12 px-4 text-left font-medium">Status</th>
                        <th className="h-12 px-4 text-right font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {initialTimesheets.map((entry) => (
                        <tr key={entry.id} className="border-b hover:bg-muted/50">
                            <td className="p-4 font-medium">{entry.user.name || entry.user.email}</td>
                            <td className="p-4">{format(new Date(entry.startTime), "PPP")}</td>
                            <td className="p-4">{format(new Date(entry.startTime), "p")}</td>
                            <td className="p-4">{entry.endTime ? format(new Date(entry.endTime), "p") : "-"}</td>
                            <td className="p-4">{entry.duration ? `${Math.floor(entry.duration / 60)}h ${entry.duration % 60}m` : "-"}</td>
                            <td className="p-4">
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${entry.status === 'APPROVED' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                        entry.status === 'OPEN' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                                            entry.status === 'SUBMITTED' ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' :
                                                'bg-red-50 text-red-700 ring-red-600/20'
                                    }`}>
                                    {entry.status}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                {entry.status === 'SUBMITTED' && (
                                    <button
                                        onClick={() => handleApprove(entry.id)}
                                        disabled={loading === entry.id}
                                        className="text-primary hover:underline disabled:opacity-50"
                                    >
                                        {loading === entry.id ? "Approving..." : "Approve"}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {initialTimesheets.length === 0 && (
                        <tr>
                            <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                No timesheet entries found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
