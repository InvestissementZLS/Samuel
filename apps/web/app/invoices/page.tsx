import { prisma } from "@/lib/prisma";
import { InvoiceList } from "@/components/invoices/invoice-list";

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
    const invoices = await prisma.invoice.findMany({
        include: {
            items: {
                include: {
                    product: true
                }
            },
            client: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    const products = await prisma.product.findMany();
    const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } });

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-gray-900">All Invoices</h1>
            <InvoiceList invoices={invoices} products={products} clients={clients} />
        </div>
    );
}
