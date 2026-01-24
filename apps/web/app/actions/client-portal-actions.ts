'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { QuoteStatus, InvoiceStatus } from '@prisma/client';

// Client Notes
export async function addClientNote(clientId: string, content: string) {
    await prisma.clientNote.create({
        data: {
            clientId,
            content,
        },
    });
    revalidatePath(`/clients/${clientId}`);
}

export async function deleteClientNote(id: string, clientId: string) {
    await prisma.clientNote.delete({
        where: { id },
    });
    revalidatePath(`/clients/${clientId}`);
}

// Quotes
// Quotes
// Helper to generate next number
async function generateNextNumber(division: "EXTERMINATION" | "ENTREPRISES", type: "INVOICE" | "QUOTE") {
    const prefix = division === "EXTERMINATION" ? "EXO" : "ENT";
    const year = new Date().getFullYear();

    let lastRecord;
    if (type === "INVOICE") {
        lastRecord = await prisma.invoice.findFirst({
            where: { number: { startsWith: `${prefix}-${year}-` } },
            orderBy: { number: 'desc' }
        });
    } else {
        lastRecord = await prisma.quote.findFirst({
            where: { number: { startsWith: `${prefix}-${year}-` } },
            orderBy: { number: 'desc' }
        });
    }

    let nextSequence = 1;
    if (type === "INVOICE") {
        nextSequence = 5031;
    }

    if (lastRecord && lastRecord.number) {
        const parts = lastRecord.number.split('-');
        if (parts.length === 3) {
            const lastSeq = parseInt(parts[2], 10);
            if (!isNaN(lastSeq)) {
                nextSequence = Math.max(lastSeq + 1, nextSequence);
            }
        }
    }

    return `${prefix}-${year}-${nextSequence.toString().padStart(4, '0')}`;
}

// Quotes
export async function createQuote(data: {
    clientId: string;
    propertyId?: string;
    total: number;
    description?: string;
    poNumber?: string;
    issuedDate?: Date;
    dueDate?: Date;
    items?: any[];
    discount?: number;
    tax?: number;
    notes?: string;
    terms?: string;
    division?: "EXTERMINATION" | "ENTREPRISES";
}) {
    console.log("createQuote called with:", JSON.stringify(data, null, 2));
    try {
        const division = data.division || "EXTERMINATION";
        console.log("Generating number for division:", division);
        const number = await generateNextNumber(division, "QUOTE");
        console.log("Generated number:", number);

        await prisma.quote.create({
            data: {
                clientId: data.clientId,
                propertyId: data.propertyId,
                total: data.total,
                description: data.description,
                status: 'DRAFT',
                poNumber: data.poNumber,
                issuedDate: data.issuedDate,
                dueDate: data.dueDate,
                discount: data.discount,
                tax: data.tax,
                notes: data.notes,
                terms: data.terms,
                division: division,
                number: number,
                items: {
                    create: data.items?.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.price,
                        description: item.description,
                        unitCost: item.unitCost,
                        taxRate: item.taxRate,
                        isUpsell: item.isUpsell
                    }))
                }
            },
        });
        console.log("Quote created successfully");
        revalidatePath(`/clients/${data.clientId}`);
    } catch (error) {
        console.error("Error creating quote:", error);
        throw error;
    }
}

export async function updateQuote(data: {
    id: string;
    clientId: string;
    poNumber?: string;
    issuedDate?: Date;
    dueDate?: Date;
    items: any[];
    discount?: number;
    tax?: number;
    notes?: string;
    terms?: string;
    total: number;
    division?: "EXTERMINATION" | "ENTREPRISES";
}) {
    console.log("updateQuote called with:", JSON.stringify(data, null, 2));
    try {
        await prisma.$transaction(async (tx) => {
            await tx.quote.update({
                where: { id: data.id },
                data: {
                    poNumber: data.poNumber,
                    issuedDate: data.issuedDate,
                    dueDate: data.dueDate,
                    discount: data.discount,
                    tax: data.tax,
                    notes: data.notes,
                    terms: data.terms,
                    total: data.total,
                    division: data.division,
                }
            });

            // Delete existing items and recreate
            await tx.quoteItem.deleteMany({
                where: { quoteId: data.id }
            });

            if (data.items && data.items.length > 0) {
                await tx.quoteItem.createMany({
                    data: data.items.map((item: any) => ({
                        quoteId: data.id,
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.price,
                        description: item.description,
                        unitCost: item.unitCost,
                        taxRate: item.taxRate,
                        isUpsell: item.isUpsell
                    }))
                });
            }
        });
        console.log("Quote updated successfully");
        revalidatePath(`/clients/${data.clientId}`);
    } catch (error) {
        console.error("Error updating quote:", error);
        throw error;
    }
}

export async function updateQuoteStatus(id: string, clientId: string, status: QuoteStatus) {
    await prisma.quote.update({
        where: { id },
        data: { status },
    });
    revalidatePath(`/clients/${clientId}`);
}

// Invoices
export async function createInvoice(data: {
    clientId: string;
    jobId?: string;
    total: number;
    description?: string;
    poNumber?: string;
    issuedDate?: Date;
    dueDate?: Date;
    items?: any[];
    discount?: number;
    tax?: number;
    notes?: string;
    terms?: string;
    division?: "EXTERMINATION" | "ENTREPRISES";
}) {
    console.log("createInvoice called with:", JSON.stringify(data, null, 2));
    try {
        const division = data.division || "EXTERMINATION";
        const number = await generateNextNumber(division, "INVOICE");
        console.log("Generated invoice number:", number);

        const invoice = await prisma.invoice.create({
            data: {
                clientId: data.clientId,
                jobId: data.jobId,
                total: data.total,
                description: data.description,
                status: 'DRAFT',
                poNumber: data.poNumber,
                issuedDate: data.issuedDate,
                dueDate: data.dueDate,
                discount: data.discount,
                tax: data.tax,
                notes: data.notes,
                terms: data.terms,
                division: division,
                number: number,
                items: {
                    create: data.items?.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.price,
                        description: item.description,
                        unitCost: item.unitCost,
                        taxRate: item.taxRate,
                        isUpsell: item.isUpsell
                    }))
                }
            },
        });
        console.log("Invoice created successfully:", invoice.id);
        revalidatePath(`/clients/${data.clientId}`);
    } catch (error) {
        console.error("Error creating invoice:", error);
        throw error;
    }
}

export async function updateInvoice(data: {
    id: string;
    clientId: string;
    poNumber?: string;
    issuedDate?: Date;
    dueDate?: Date;
    items: any[];
    discount?: number;
    tax?: number;
    notes?: string;
    terms?: string;
    total: number;
}) {
    await prisma.$transaction(async (tx) => {
        await tx.invoice.update({
            where: { id: data.id },
            data: {
                poNumber: data.poNumber,
                issuedDate: data.issuedDate,
                dueDate: data.dueDate,
                discount: data.discount,
                tax: data.tax,
                notes: data.notes,
                terms: data.terms,
                total: data.total,
            }
        });

        // Delete existing items and recreate
        await tx.invoiceItem.deleteMany({
            where: { invoiceId: data.id }
        });

        if (data.items && data.items.length > 0) {
            await tx.invoiceItem.createMany({
                data: data.items.map((item: any) => ({
                    invoiceId: data.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    description: item.description,
                    unitCost: item.unitCost,
                    taxRate: item.taxRate,
                    isUpsell: item.isUpsell
                }))
            });
        }
    });

    revalidatePath(`/clients/${data.clientId}`);
}

export async function updateInvoiceStatus(id: string, clientId: string, status: InvoiceStatus) {
    await prisma.invoice.update({
        where: { id },
        data: { status },
    });
    revalidatePath(`/clients/${clientId}`);
}

// Invoice Items
export async function addInvoiceItem(invoiceId: string, productId: string, quantity: number, price: number) {
    await prisma.invoiceItem.create({
        data: {
            invoiceId,
            productId,
            quantity,
            price,
        },
    });
    // Update invoice total
    const items = await prisma.invoiceItem.findMany({ where: { invoiceId } });
    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    await prisma.invoice.update({
        where: { id: invoiceId },
        data: { total },
    });

    // Revalidate
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (invoice) revalidatePath(`/clients/${invoice.clientId}`);
}

export async function removeInvoiceItem(itemId: string, invoiceId: string) {
    await prisma.invoiceItem.delete({
        where: { id: itemId },
    });
    // Update invoice total
    const items = await prisma.invoiceItem.findMany({ where: { invoiceId } });
    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    await prisma.invoice.update({
        where: { id: invoiceId },
        data: { total },
    });

    // Revalidate
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (invoice) revalidatePath(`/clients/${invoice.clientId}`);
}

// Quote Items
export async function addQuoteItem(quoteId: string, productId: string, quantity: number, price: number) {
    await prisma.quoteItem.create({
        data: {
            quoteId,
            productId,
            quantity,
            price,
        },
    });
    // Update quote total
    const items = await prisma.quoteItem.findMany({ where: { quoteId } });
    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    await prisma.quote.update({
        where: { id: quoteId },
        data: { total },
    });

    // Revalidate
    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    if (quote) revalidatePath(`/clients/${quote.clientId}`);
}

export async function removeQuoteItem(itemId: string, quoteId: string) {
    await prisma.quoteItem.delete({
        where: { id: itemId },
    });
    // Update quote total
    const items = await prisma.quoteItem.findMany({ where: { quoteId } });
    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    await prisma.quote.update({
        where: { id: quoteId },
        data: { total },
    });


    // Revalidate
    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    if (quote) revalidatePath(`/clients/${quote.clientId}`);
}

export async function deleteInvoice(id: string) {
    const invoice = await prisma.invoice.findUnique({
        where: { id },
    });

    if (!invoice) {
        throw new Error("Invoice not found");
    }

    if (invoice.status === 'PAID') {
        throw new Error("Cannot delete a paid invoice");
    }

    // Delete invoice items first (if cascade is not set up, though usually it is helpful to be explicit)
    await prisma.invoiceItem.deleteMany({
        where: { invoiceId: id },
    });

    await prisma.invoice.delete({
        where: { id },
    });

    revalidatePath(`/clients/${invoice.clientId}`);
    revalidatePath('/invoices');
}

