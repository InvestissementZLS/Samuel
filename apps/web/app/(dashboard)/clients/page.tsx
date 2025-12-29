import { prisma } from '@/lib/prisma';
import { ClientList } from '@/components/clients/client-list';

export default async function ClientsPage() {
    const clients = await prisma.client.findMany({
        orderBy: { name: 'asc' },
    });

    return (
        <div className="p-8">
            <ClientList clients={clients} />
        </div>
    );
}
