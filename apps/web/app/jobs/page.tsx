import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { JobList } from '@/components/jobs/job-list';

export default async function JobsPage() {
    const jobs = await prisma.job.findMany({
        include: {
            property: {
                include: {
                    client: true,
                },
            },
            technicians: true,
        },
        orderBy: { scheduledAt: 'asc' },
    });

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Work Orders / Jobs</h1>
                <Link
                    href="/jobs/new"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    + New Job
                </Link>
            </div>

            <JobList jobs={jobs} />
        </div>
    );
}
