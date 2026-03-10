import { prisma } from "@/lib/prisma";
import { InvoiceList } from "@/components/invoices/invoice-list";
import { serialize } from '@/lib/serialization';
import { getUserProfile } from "@/app/actions/user-actions";

import { cookies } from "next/headers";
import { dictionary } from "@/lib/i18n/dictionary";

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function InvoicesPage({ searchParams }: { searchParams?: { page?: string } }) {
    const cookieStore = cookies();
    const cookieLang = cookieStore.get("NEXT_LOCALE")?.value;
    const initialLanguage = (cookieLang === "fr" || cookieLang === "en") ? cookieLang : "en";
    const t = dictionary[initialLanguage] || dictionary.en;

    const user = await getUserProfile();
    const page = Math.max(1, parseInt(searchParams?.page || '1', 10));

    let whereClause: any = {};
    if (user && !user.canManageDivisions) {
        // @ts-ignore
        const allowedDivisions = user.accesses.map((a: any) => a.division) || [];
        whereClause.division = { in: allowedDivisions };
    }

    if (searchParams?.clientId) {
        whereClause.clientId = searchParams.clientId;
    }

    // Requête allégée : on ne charge PAS les items ici (chargés à la demande)
    // On sélectionne uniquement les colonnes nécessaires pour la liste
    const [invoices, totalCount] = await Promise.all([
        prisma.invoice.findMany({
            where: whereClause,
            select: {
                id: true,
                number: true,
                status: true,
                total: true,
                amountPaid: true,
                dueDate: true,
                createdAt: true,
                division: true,
                clientId: true,
                description: true,
                notes: true,
                discount: true,
                tax: true,
                client: {
                    select: { id: true, name: true, email: true, phone: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
        prisma.invoice.count({ where: whereClause })
    ]);

    // Clients : seulement id + nom, le dropdown n'a pas besoin de toutes les données
    const clients = await prisma.client.findMany({
        select: { id: true, name: true, email: true, phone: true },
        orderBy: { name: 'asc' },
        take: 200  // Limite raisonnable pour le formulaire
    });

    // Produits : seulement ce qui est nécessaire pour le formulaire
    const products = await prisma.product.findMany({
        select: {
            id: true,
            name: true,
            price: true,
            cost: true,
            unit: true,
            division: true,
            type: true,
        }
    });

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-gray-900">{t.invoices.title}</h1>
            <InvoiceList
                invoices={serialize(invoices) as any}
                products={serialize(products) as any}
                clients={serialize(clients) as any}
                currentPage={page}
                totalPages={totalPages}
                totalCount={totalCount}
            />
        </div>
    );
}
