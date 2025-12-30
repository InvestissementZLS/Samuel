import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { InvoicePortalClient } from "./invoice-portal-client";

interface PageProps {
    params: {
        id: string;
    }
}

export default async function InvoicePortalPage({ params }: PageProps) {
    /*
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

    // Aggressive manual serialization to prevent ANY proprietary objects (Decimal, Date) from leaking
    const serializedInvoice = {
        id: invoice.id,
        number: invoice.number,
        clientId: invoice.clientId,
        status: invoice.status,
        issuedDate: invoice.issuedDate.toISOString(),
        dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
        total: (invoice.total as any).toNumber ? (invoice.total as any).toNumber() : Number(invoice.total),
        subtotal: invoice.subtotal ? ((invoice.subtotal as any).toNumber ? (invoice.subtotal as any).toNumber() : Number(invoice.subtotal)) : 0,
        tax: invoice.tax ? ((invoice.tax as any).toNumber ? (invoice.tax as any).toNumber() : Number(invoice.tax)) : 0,
        amountPaid: invoice.amountPaid ? ((invoice.amountPaid as any).toNumber ? (invoice.amountPaid as any).toNumber() : Number(invoice.amountPaid)) : 0,
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
            price: (item.price as any).toNumber ? (item.price as any).toNumber() : Number(item.price),
            product: {
                name: item.product.name,
                description: item.product.description,
            }
        }))
    };
    */

    // DEBUG: Static Data to isolate persistent crash
    const serializedInvoice = {
        id: "debug-id",
        number: "INV-DEBUG",
        clientId: "debug-client",
        status: "SENT",
        issuedDate: new Date().toISOString(),
        dueDate: null,
        total: 100.00,
        subtotal: 90.00,
        tax: 10.00,
        amountPaid: 0,
        division: "EXTERMINATION",
        client: {
            name: "Debug Client",
            email: "debug@test.com",
            billingAddress: "123 Debug St",
            language: "FR"
        },
        items: [
            {
                id: "item-1",
                description: "Debug Item",
                quantity: 1,
                price: 90.00,
                product: {
                    name: "Debug Product",
                    description: "Test description"
                }
            }
        ]
    };

    return <InvoicePortalClient invoice={serializedInvoice} />;
}
