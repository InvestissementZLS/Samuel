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

    return <QuotePortalClient quote={quote} />;
}
