import { prisma } from "@/lib/prisma";
import { QuoteList } from "@/components/quotes/quote-list";
import { serialize } from '@/lib/serialization';
import { cookies } from "next/headers";
import { dictionary } from "@/lib/i18n/dictionary";

export const dynamic = 'force-dynamic';

export default async function QuotesPage() {
    const cookieStore = cookies();
    const lang = cookieStore.get("NEXT_LOCALE")?.value || "en";
    const t = dictionary[lang as keyof typeof dictionary] || dictionary.en;

    let quotes: any[] = [];
    try {
        quotes = await prisma.quote.findMany({
            include: {
                items: { include: { product: true } },
                client: true
            },
            orderBy: { createdAt: 'desc' }
        });
    } catch (e) {
        console.error("Failed to load quotes", e);
    }

    const products = await prisma.product.findMany();
    const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } });

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-gray-900">{t.quotes.title}</h1>
            <QuoteList quotes={serialize(quotes)} products={serialize(products)} clients={serialize(clients)} />
        </div>
    );
}
