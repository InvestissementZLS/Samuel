import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { InvoicePortalClient } from "./invoice-portal-client";

interface PageProps {
    params: {
        id: string;
    }
}

export default async function InvoicePortalPage({ params }: PageProps) {
    try {
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
    } catch (error: any) {
        console.error("CRITICAL PORTAL ERROR:", error);
        return (
            <div className="p-8 max-w-2xl mx-auto mt-10 bg-red-50 border border-red-200 rounded-lg">
                <h1 className="text-2xl font-bold text-red-700 mb-4">Debug Error View</h1>
                <p className="font-mono text-sm whitespace-pre-wrap text-red-900 bg-red-100 p-4 rounded">
                    {error?.message || JSON.stringify(error)}
                </p>
                <p className="mt-4 text-xs text-gray-500">
                    Stack: {error?.stack}
                </p>
            </div>
        );
    }
}
