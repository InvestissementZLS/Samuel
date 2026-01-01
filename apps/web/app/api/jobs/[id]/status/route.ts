import { NextRequest, NextResponse } from 'next/server';
import { updateJobStatus } from '@/app/actions/job-tracking-actions';
import { JobStatus } from '@prisma/client';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const jobId = params.id;
        const body = await request.json();
        const { status, latitude, longitude } = body;

        // Basic validation
        if (!status || !Object.values(JobStatus).includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const location = (latitude && longitude) ? { lat: latitude, lng: longitude } : undefined;

        const result = await updateJobStatus(jobId, status as JobStatus, location);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Job Status Update Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
