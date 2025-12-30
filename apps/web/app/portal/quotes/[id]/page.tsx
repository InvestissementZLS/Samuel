import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { QuotePortalClient } from "./quote-portal-client";

interface PageProps {
    params: {
        id: string;
    }
}

export default async function QuotePortalPage({ params }: PageProps) {
    const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        include: {
            client: true,
            items: {
                include: {
                    product: true
                }
            }
        }
    });

    if (!quote) {
        notFound();
    }

    // Aggressive manual serialization to prevent ANY proprietary objects (Decimal, Date) from leaking
    const serializedQuote = {
        id: quote.id,
        number: quote.number,
        clientId: quote.clientId,
        status: quote.status,
        issuedDate: quote.issuedDate.toISOString(),
        dueDate: quote.dueDate ? quote.dueDate.toISOString() : null,
        total: (quote.total as any).toNumber ? (quote.total as any).toNumber() : Number(quote.total),
        tax: quote.tax ? ((quote.tax as any).toNumber ? (quote.tax as any).toNumber() : Number(quote.tax)) : 0,
        discount: quote.discount ? ((quote.discount as any).toNumber ? (quote.discount as any).toNumber() : Number(quote.discount)) : 0,
        division: quote.division,
        signature: quote.signature || null,
        signedAt: quote.signedAt ? quote.signedAt.toISOString() : null,
        client: {
            name: quote.client.name,
            email: quote.client.email,
            billingAddress: quote.client.billingAddress,
            language: (quote.client as any).language || 'FR',
        },
        items: quote.items.map((item: any) => ({
            id: item.id,
            description: item.description,
            quantity: Number(item.quantity),
            price: (item.price as any).toNumber ? (item.price as any).toNumber() : Number(item.price),
            product: {
                name: item.product.name,
                description: item.product.description,
            }
        }))
    };

    return <QuotePortalClient quote={serializedQuote} />;
}
