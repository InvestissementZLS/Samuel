import { prisma } from '@/lib/prisma';
import { JobList } from '@/components/jobs/job-list';
import { serialize } from '@/lib/serialization';
import { cookies } from 'next/headers';
import { Division } from '@prisma/client';

const PAGE_SIZE = 50;

export default async function JobsPage({ searchParams }: { searchParams?: { page?: string } }) {
    const page = Math.max(1, parseInt(searchParams?.page || '1', 10));

    const cookieStore = await cookies();
    const divisionVal = cookieStore.get('division')?.value || 'EXTERMINATION';
    const division = divisionVal as Division;

    const [jobsData, totalCount] = await Promise.all([
        prisma.job.findMany({
            where: { division },
            include: {
                property: { include: { client: true } },
                technicians: true,
                products: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: { scheduledAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
        prisma.job.count({ where: { division } })
    ]);

    const services = await prisma.product.findMany({
        where: { type: 'SERVICE' },
        orderBy: { name: 'asc' }
    });

    const jobs = serialize(jobsData);
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <div className="space-y-6">
            <JobList 
                jobs={jobs as any} 
                services={services as any} 
                showHeader 
                currentPage={page}
                totalPages={totalPages}
                totalCount={totalCount}
            />
        </div>
    );
}
