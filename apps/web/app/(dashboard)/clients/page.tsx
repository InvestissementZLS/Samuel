import { prisma } from '@/lib/prisma';
import { ClientList } from '@/components/clients/client-list';

const PAGE_SIZE = 50;

export default async function ClientsPage({ searchParams }: { searchParams?: { page?: string } }) {
    const page = Math.max(1, parseInt(searchParams?.page || '1', 10));

    const [clients, totalCount] = await Promise.all([
        prisma.client.findMany({
            orderBy: { name: 'asc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
        prisma.client.count()
    ]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <div className="p-8">
            <ClientList 
                clients={clients} 
                currentPage={page}
                totalPages={totalPages}
                totalCount={totalCount}
            />
        </div>
    );
}
