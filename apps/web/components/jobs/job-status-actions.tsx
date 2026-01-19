'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, CheckCircle, Loader2 } from 'lucide-react';
import { startJob } from '@/app/actions/report-actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CompleteJobDialog } from './complete-job-dialog';

interface JobStatusActionsProps {
    jobId: string;
    status: string;
}

export function JobStatusActions({ jobId, status }: JobStatusActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
    const router = useRouter();

    const handleStartJob = async () => {
        setIsLoading(true);
        try {
            const result = await startJob(jobId);
            if (result.success) {
                toast.success("Job started!");
                router.refresh();
            } else {
                toast.error("Failed to start job: " + result.error);
            }
        } catch (error) {
            toast.error("Error starting job");
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'SCHEDULED' || status === 'PENDING' || status === 'EN_ROUTE') {
        return (
            <Button
                onClick={handleStartJob}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
            >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Start Job
            </Button>
        );
    }

    if (status === 'IN_PROGRESS') {
        return (
            <>
                <Button
                    onClick={() => setIsCompleteDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Job
                </Button>

                <CompleteJobDialog
                    jobId={jobId}
                    isOpen={isCompleteDialogOpen}
                    onClose={() => setIsCompleteDialogOpen(false)}
                />
            </>
        );
    }

    return null; // No actions for completed/cancelled jobs
}
