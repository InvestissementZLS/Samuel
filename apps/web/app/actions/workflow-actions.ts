'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function convertQuoteToJob(quoteId: string) {
    const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: { items: true }
    });

    if (!quote) {
        throw new Error("Quote not found");
    }

    if (!quote.propertyId) {
        // If no property is associated, we might need to pick one or create a job without one (but Job requires propertyId)
        // For now, let's assume we pick the first property of the client or fail
        const firstProperty = await prisma.property.findFirst({
            where: { clientId: quote.clientId }
        });

        if (!firstProperty) {
            throw new Error("Client has no properties to assign the job to.");
        }

        // Update quote with property if it was missing? Or just use it for the job.
        quote.propertyId = firstProperty.id;
    }

    // Create Job
    const job = await prisma.job.create({
        data: {
            propertyId: quote.propertyId!,
            division: quote.division,
            status: 'PENDING',
            scheduledAt: new Date(), // Default to now, user can reschedule
            description: `Converted from Quote #${quote.number || quote.poNumber || 'N/A'}. ${quote.description || ''}`,
            products: {
                create: quote.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                }))
            }
        }
    });

    // Update Quote status
    await prisma.quote.update({
        where: { id: quoteId },
        data: { status: 'ACCEPTED' }
    });

    revalidatePath('/jobs');
    revalidatePath('/quotes');
    redirect(`/jobs/${job.id}`);
}

export async function convertJobToInvoice(jobId: string) {
    const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
            property: true,
            products: {
                include: { product: true }
            }
        }
    });

    if (!job) {
        throw new Error("Job not found");
    }

    // Calculate total from used products
    const items = job.products.map(used => ({
        productId: used.productId,
        quantity: used.quantity,
        price: used.product.price,
        description: used.product.name,
        unitCost: 0,
        taxRate: 0,
        warrantyInfo: used.product.warrantyInfo // Fetch warranty info
    }));

    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    // Generate Invoice Number
    const prefix = job.division === "EXTERMINATION" ? "EXO" : "ENT";
    const year = new Date().getFullYear();
    const lastInvoice = await prisma.invoice.findFirst({
        where: { number: { startsWith: `${prefix}-${year}-` } },
        orderBy: { number: 'desc' }
    });

    let nextSequence = 1;
    if (lastInvoice && lastInvoice.number) {
        const parts = lastInvoice.number.split('-');
        if (parts.length === 3) {
            const lastSeq = parseInt(parts[2], 10);
            if (!isNaN(lastSeq)) {
                nextSequence = lastSeq + 1;
            }
        }
    }
    const number = `${prefix}-${year}-${nextSequence.toString().padStart(4, '0')}`;

    const invoice = await prisma.invoice.create({
        data: {
            clientId: job.property.clientId,
            jobId: job.id,
            division: job.division,
            status: 'DRAFT',
            number: number,
            issuedDate: new Date(),
            dueDate: new Date(), // Due on receipt
            total: total,
            description: `Invoice for Job on ${job.scheduledAt.toLocaleDateString()}`,
            // @ts-ignore
            notes: items.map(i => i.warrantyInfo).filter(w => !!w).join("\n\n"), // Append Warranty Info
            items: {
                create: items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    description: item.description
                    // Note: InvoiceItem model might not have unitCost/taxRate yet, relying on defaults
                }))
            }
        }
    });

    // Update Job status? Maybe not, job can be completed but not invoiced, or invoiced.
    // But usually we mark it as completed if it wasn't.
    if (job.status !== 'COMPLETED') {
        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'COMPLETED' }
        });
    }

    revalidatePath('/invoices');
    revalidatePath('/jobs');
    redirect(`/invoices`); // Or to the specific invoice? redirect is tricky in server actions if we want to open a modal.
    // Since we don't have a dedicated invoice page (we use the list with modal), redirecting to /invoices is fine.
    // Ideally we would open the invoice, but that requires client-side state.
}
