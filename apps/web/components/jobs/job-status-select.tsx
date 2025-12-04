"use client";

import { useState } from "react";
import { JobStatus } from "@prisma/client";
import { updateJobStatus } from "@/app/actions/job-details-actions";
import { toast } from "sonner";

interface JobStatusSelectProps {
    jobId: string;
    currentStatus: JobStatus;
}

export function JobStatusSelect({ jobId, currentStatus }: JobStatusSelectProps) {
    const [loading, setLoading] = useState(false);

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as JobStatus;
        setLoading(true);
        try {
            await updateJobStatus(jobId, newStatus);
            toast.success(`Status updated to ${newStatus}`);
        } catch (error) {
            console.error("Failed to update status:", error);
            toast.error("Failed to update status");
        } finally {
            setLoading(false);
        }
    };

    return (
        <select
            value={currentStatus}
            onChange={handleChange}
            disabled={loading}
            className={`rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border
                ${currentStatus === 'COMPLETED' ? 'bg-green-50 text-green-800 border-green-200' :
                    currentStatus === 'IN_PROGRESS' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                        currentStatus === 'SCHEDULED' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            'bg-white text-gray-900'}`}
        >
            <option value="PENDING">Pending</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
        </select>
    );
}
