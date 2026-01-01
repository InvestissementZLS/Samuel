"use client";

import { Button } from "@/components/ui/button";
import { convertJobToInvoice } from "@/app/actions/workflow-actions";
import { deleteCalendarJob } from "@/app/actions/calendar-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface JobActionsProps {
    jobId: string;
}

export function JobActions({ jobId }: JobActionsProps) {
    const router = useRouter();

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this job? This cannot be undone.")) {
            try {
                await deleteCalendarJob(jobId);
                toast.success("Job deleted");
                router.push("/calendar");
            } catch (error) {
                console.error(error);
                toast.error("Failed to delete job");
            }
        }
    };

    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                onClick={async () => {
                    if (confirm("Create an invoice from this job?")) {
                        await convertJobToInvoice(jobId);
                        toast.success("Invoice created");
                    }
                }}
            >
                Create Invoice
            </Button>
            <Button
                variant="destructive"
                onClick={handleDelete}
                className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 border shadow-none"
            >
                <Trash2 size={16} className="mr-2" />
                Delete Job
            </Button>
        </div>
    );
}
