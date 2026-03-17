import { prisma } from '@/lib/prisma';
import { ClientList } from '@/components/clients/client-list';

import { cookies } from 'next/headers';
import { Division } from '@prisma/client';

const PAGE_SIZE = 50;

export default async function ClientsPage({ searchParams }: { searchParams?: { page?: string } }) {
    const page = Math.max(1, parseInt(searchParams?.page || '1', 10));
    
    const cookieStore = await cookies();
    const divisionVal = cookieStore.get('division')?.value || 'EXTERMINATION';
    const division = divisionVal as Division;

    console.log("SERVER PAGE RENDER: Client Page. Cookie division is:", divisionVal, "Parsed as:", division);

    const [clients, totalCount] = await Promise.all([
        prisma.client.findMany({
            where: {
                divisions: {
                    has: division
                }
            },
            orderBy: { name: 'asc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
        prisma.client.count({
            where: {
                divisions: {
                    has: division
                }
            }
        })
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
