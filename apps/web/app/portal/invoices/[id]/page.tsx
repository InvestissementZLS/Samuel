import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { InvoicePortalClient } from "./invoice-portal-client";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function InvoicePortalPage({ params }: PageProps) {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
        where: { id },
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

    // Manual serialization of properties that EXIST in the DB Schema.
    // 'subtotal' is NOT in the DB, so we do not serialize it (Client calculates it).
    // Money fields are Float in Prisma, so we treat them as numbers.
    const serializedInvoice = {
        id: invoice.id,
        number: invoice.number,
        clientId: invoice.clientId,
        status: invoice.status,
        issuedDate: invoice.issuedDate.toISOString(),
        dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
        total: invoice.total || 0,
        tax: invoice.tax || 0,
        amountPaid: invoice.amountPaid || 0,
        division: invoice.division,
        client: {
            name: invoice.client.name,
            email: invoice.client.email,
            billingAddress: invoice.client.billingAddress,
            language: (invoice.client as any).language || 'FR',
        },
        items: invoice.items.map((item: any) => ({
            id: item.id,
            description: item.description,
            quantity: Number(item.quantity),
            price: Number(item.price),
            product: {
                name: item.product?.name || "Unknown Product",
                description: item.product?.description || "",
            }
        }))
    };


    return <InvoicePortalClient invoice={serializedInvoice} />;
}
