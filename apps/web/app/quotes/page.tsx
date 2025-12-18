import { prisma } from "@/lib/prisma";
import { QuoteList } from "@/components/quotes/quote-list";

export const dynamic = 'force-dynamic';

export default async function QuotesPage() {
    const quotes = await prisma.quote.findMany({
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

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-gray-900">All Quotes</h1>
            <QuoteList quotes={quotes} products={products} />
        </div>
    );
}
