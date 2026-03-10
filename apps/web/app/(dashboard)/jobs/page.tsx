import { prisma } from '@/lib/prisma';
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
            <JobList jobs={jobs} services={services} showHeader />
        </div>
    );
}
