'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { QuoteStatus, InvoiceStatus, Prisma } from '@prisma/client';
import { isExteriorPreventionProduct } from '@/lib/constants/prevention-product-keywords';

async function autoCreatePreventionJobIfNeeded(clientId: string, productIds: string[]) {
    if (!productIds || productIds.length === 0) return;

    try {
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } }
        });

        // Check if there's any prevention product included
        const preventionProducts = products.filter(p => isExteriorPreventionProduct(p.name));
        if (preventionProducts.length === 0) return;

        // Get main property of client
        let firstProperty = await prisma.property.findFirst({
            where: { clientId, isDeleted: false },
            orderBy: { createdAt: 'asc' }
        });

        // 🔥 Bulletproof Step 1: Guarantee Property Creation
        if (!firstProperty) {
            const client = await prisma.client.findUnique({ where: { id: clientId } });
            if (!client) return; // Client must exist

            const addressStr = client.billingAddress || "";
            const pcMatch = addressStr.match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/i);
            const postalCode = pcMatch ? pcMatch[0].toUpperCase().replace(/\s/g, '') : null;

            firstProperty = await prisma.property.create({
                data: {
                    clientId: client.id,
                    address: addressStr || "Adresse à confirmer",
                    postalCode: postalCode,
                    type: "RESIDENTIAL",
                    province: "QC",
                    country: "Canada"
                }
            });
            console.log(`Auto-created missing property for client ${clientId} using billing address. Postal Code extracted: ${postalCode}`);
        }

        // Prevent duplicates: skip if a pending prevention job already exists
        const existingJob = await prisma.job.findFirst({
            where: {
                propertyId: firstProperty.id,
                status: 'PENDING',
                isDeleted: false,
                products: {
                    some: {
                        productId: { in: preventionProducts.map(p => p.id) }
                    }
                }
            }
        });

        if (existingJob) return;

        // Determine if it's an annual plan (needs 2 visits)
        const isAnnualPlan = preventionProducts.some(p => 
            p.name.toLowerCase().includes('plan annuel') || 
            p.name.toLowerCase().includes('deux traitements') || 
            p.name.toLowerCase().includes('2 traitements')
        );

        const visitsToCreate = isAnnualPlan ? 2 : 1;

        for (let i = 0; i < visitsToCreate; i++) {
            // Space the second visit by 60 days
            const scheduledDate = new Date();
            if (i === 1) {
                scheduledDate.setDate(scheduledDate.getDate() + 60);
            }

            let description = 'Généré automatiquement suite à une facturation ou soumission de prévention.';
            if (isAnnualPlan) {
                description = i === 0 
                    ? 'Visite 1 (Initiale) - Plan Annuel généré automatiquement.'
                    : 'Visite 2 (Mi-saison) - Plan Annuel généré automatiquement.';
            }

            await prisma.job.create({
                data: {
                    propertyId: firstProperty.id,
                    status: 'PENDING',
                    scheduledAt: scheduledDate, 
                    description: description,
                    division: 'EXTERMINATION',
                    products: {
                        create: preventionProducts.map(p => ({
                            productId: p.id,
                            quantity: 1,
                            price: p.price || 0
                        }))
                    }
                }
            });
        }

        console.log(`Auto-created prevention job for client ${clientId}`);
    } catch (error) {
        console.error("Error auto-creating prevention job:", error);
    }
}

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
    const updatedQuote = await prisma.quote.update({
        where: { id },
        data: { status },
        include: { items: true }
    });
    
    // Auto trigger prevention job
    if (status === 'ACCEPTED') {
        const productIds = updatedQuote.items.map(item => item.productId).filter(id => id !== null) as string[];
        await autoCreatePreventionJobIfNeeded(clientId, productIds);
    } else if (status === 'REJECTED') {
        // 🔥 Bulletproof Step 2: Auto cancel jobs if quote rejected
        await prisma.job.deleteMany({
            where: {
                property: { clientId: clientId },
                status: 'PENDING',
                description: { contains: 'généré automatiquement' }
            }
        });
        console.log(`Auto-deleted prevention jobs for client ${clientId} due to quote rejection`);
    }

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

        // Auto trigger prevention job
        if (data.items && data.items.length > 0) {
            const productIds = data.items.map(item => item.productId).filter(id => id !== null) as string[];
            await autoCreatePreventionJobIfNeeded(data.clientId, productIds);
        }

        revalidatePath(`/clients/${data.clientId}`);
        revalidatePath('/invoices');
        return { id: invoice.id };
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

    // Auto trigger prevention job
    if (data.items && data.items.length > 0) {
        const productIds = data.items.map(item => item.productId).filter(id => id !== null) as string[];
        await autoCreatePreventionJobIfNeeded(data.clientId, productIds);
    }

    revalidatePath(`/clients/${data.clientId}`);
}

export async function updateInvoiceStatus(id: string, clientId: string, status: InvoiceStatus) {
    await prisma.invoice.update({
        where: { id },
        data: { status },
    });

    if (status === 'CANCELLED' || status === 'REFUNDED') {
        // 🔥 Bulletproof Step 2: Auto cancel jobs if invoice cancelled
        await prisma.job.deleteMany({
            where: {
                property: { clientId: clientId },
                status: 'PENDING',
                description: { contains: 'généré automatiquement' }
            }
        });
        console.log(`Auto-deleted prevention jobs for client ${clientId} due to invoice cancellation`);
    }

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

    await prisma.invoice.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() }
    });

    revalidatePath(`/clients/${invoice.clientId}`);
    revalidatePath('/invoices');
}

