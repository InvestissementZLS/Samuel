import { prisma } from "@/lib/prisma";
import { QuoteList } from "@/components/quotes/quote-list";
import { serialize } from '@/lib/serialization';
import { cookies } from "next/headers";
import { dictionary } from "@/lib/i18n/dictionary";

const PAGE_SIZE = 50;

export default async function QuotesPage({ searchParams }: { searchParams?: { page?: string } }) {
    const cookieStore = cookies();
    const lang = cookieStore.get("NEXT_LOCALE")?.value || "en";
    const t = dictionary[lang as keyof typeof dictionary] || dictionary.en;
    const page = Math.max(1, parseInt(searchParams?.page || '1', 10));

    let quotes: any[] = [];
    let totalCount = 0;
    try {
        [quotes, totalCount] = await Promise.all([
            prisma.quote.findMany({
                include: {
                    items: { include: { product: true } },
                    client: true
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * PAGE_SIZE,
                take: PAGE_SIZE,
            }),
            prisma.quote.count()
        ]);
    } catch (e) {
        console.error("Failed to load quotes", e);
    }

    const products = await prisma.product.findMany({
        select: { id: true, name: true, price: true, unit: true }
    });
    const clients = await prisma.client.findMany({ 
        select: { id: true, name: true, email: true, phone: true },
        orderBy: { name: 'asc' },
        take: 200 // Limit for the dropdown
    });

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-gray-900">{t.quotes.title}</h1>
            <QuoteList 
                quotes={serialize(quotes)} 
                products={serialize(products)} 
                clients={serialize(clients)} 
                currentPage={page}
                totalPages={totalPages}
                totalCount={totalCount}
            />
        </div>
    );
}
