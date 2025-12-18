import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { InvoicePortalClient } from "./invoice-portal-client";

interface PageProps {
    params: {
        id: string;
    }
}

export default async function InvoicePortalPage({ params }: PageProps) {
    const invoice = await prisma.invoice.findUnique({
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

    if (!invoice) {
        notFound();
    }

    return <InvoicePortalClient invoice={invoice} />;
}
