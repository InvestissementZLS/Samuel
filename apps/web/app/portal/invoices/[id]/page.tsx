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

    // Use JSON serialization to handle Date objects and ensure clean data for client component
    const serializedInvoice = JSON.parse(JSON.stringify(invoice));

    // Ensure numeric fields are numbers (in case of weird Prisma behavior, though schema says Float)
    // But primarly this fixes the "Date object" serialization issue
    return <InvoicePortalClient invoice={serializedInvoice} />;
}
