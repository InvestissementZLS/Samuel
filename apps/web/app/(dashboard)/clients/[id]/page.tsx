import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClientTabs } from '@/components/clients/client-tabs';
import { ClientHeader } from '@/components/clients/client-header';
import { CopyPortalLink } from '@/components/clients/copy-portal-link';
import { getOrCreateClientPortalToken } from '@/app/actions/portal-actions';

export default async function ClientDetailsPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const client = await prisma.client.findUnique({
        where: { id },
        include: {
            properties: { where: { isDeleted: false } },
            notes: {
                orderBy: { createdAt: 'desc' },
            },
            quotes: {
                where: { isDeleted: false },
                orderBy: { createdAt: 'desc' },
                include: {
                    items: {
                        include: { product: true },
                    },
                },
            },
            invoices: {
                where: { isDeleted: false },
                orderBy: { createdAt: 'desc' },
                include: {
                    items: {
                        include: { product: true },
                    },
                },
            },
            captures: {
                orderBy: { caughtAt: 'desc' }
            }
        },
    });

    if (!client) {
        notFound();
    }

    // Fetch jobs for all properties of this client
    const jobs = await prisma.job.findMany({
        where: {
            property: {
                clientId: client.id,
            },
            isDeleted: false,
        },
        include: {
            property: true,
        },
        orderBy: { scheduledAt: 'desc' },
    });

    const products = await prisma.product.findMany({
        orderBy: { name: 'asc' },
    });
    
    const portalToken = await getOrCreateClientPortalToken(client.id);

    return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="flex justify-between items-start mb-6">
                <ClientHeader client={client} portalToken={portalToken} />
                <CopyPortalLink clientId={client.id} />
            </div>

            <ClientTabs
                client={client}
                jobs={jobs}
                notes={client.notes}
                quotes={client.quotes}
                invoices={client.invoices}
                products={products}
                captures={client.captures}
            />
        </div>
    );
}
