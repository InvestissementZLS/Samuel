import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { JobList } from '@/components/jobs/job-list';
import { serialize } from '@/lib/serialization';

export default async function JobsPage() {
    const jobsData = await prisma.job.findMany({
        include: {
            property: { include: { client: true } },
            technicians: true,
            products: {
                include: {
                    product: true
                }
            }
        },
        orderBy: { scheduledAt: 'asc' },
    });

    const services = await prisma.product.findMany({
        where: { type: 'SERVICE' },
        orderBy: { name: 'asc' }
    });

    const jobs = serialize(jobsData);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Work Orders / Jobs</h1>
                <Link
                    href="/jobs/new"
                    className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-center"
                >
                    + New Job
                </Link>
            </div>

            <JobList jobs={jobs} services={services} />
        </div>
    );
}
