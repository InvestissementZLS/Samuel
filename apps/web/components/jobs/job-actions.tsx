"use client";

import { Button } from "@/components/ui/button";
import { convertJobToInvoice } from "@/app/actions/workflow-actions";

interface JobActionsProps {
    jobId: string;
}

export function JobActions({ jobId }: JobActionsProps) {
    return (
        <Button
            variant="outline"
            onClick={async () => {
                if (confirm("Create an invoice from this job?")) {
                    await convertJobToInvoice(jobId);
                }
            }}
        >
            Create Invoice
        </Button>
    );
}
