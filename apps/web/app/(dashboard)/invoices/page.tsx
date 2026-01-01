import { prisma } from "@/lib/prisma";
import { InvoiceList } from "@/components/invoices/invoice-list";
import { serialize } from '@/lib/serialization';
import { cookies } from "next/headers";
import { dictionary } from "@/lib/i18n/dictionary";

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
    const cookieStore = cookies();
    const cookieLang = cookieStore.get("NEXT_LOCALE")?.value;
    const initialLanguage = (cookieLang === "fr" || cookieLang === "en") ? cookieLang : "en";
    const t = dictionary[initialLanguage] || dictionary.en;

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
            <h1 className="text-3xl font-bold mb-8 text-gray-900">{t.invoices.title}</h1>
            <InvoiceList invoices={serialize(invoices)} products={products} clients={clients} />
        </div>
    );
}
