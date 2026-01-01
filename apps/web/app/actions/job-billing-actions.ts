'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { InvoiceStatus } from '@prisma/client';
import { calculateJobCosts } from './cost-actions';

// Generate invoice number helper (reused logic, ideally shared)
async function generateInvoiceNumber(division: "EXTERMINATION" | "ENTREPRISES") {
    const prefix = division === "EXTERMINATION" ? "EXO" : "ENT";
    const year = new Date().getFullYear();
    const lastRecord = await prisma.invoice.findFirst({
        where: { number: { startsWith: `${prefix}-${year}-` } },
        orderBy: { number: 'desc' }
    });

    let nextSequence = 1;
    if (lastRecord && lastRecord.number) {
        const parts = lastRecord.number.split('-');
        if (parts.length === 3) {
            const lastSeq = parseInt(parts[2], 10);
            if (!isNaN(lastSeq) && lastSeq > 0) {
                nextSequence = lastSeq + 1;
            }
        }
    }
    return `${prefix}-${year}-${nextSequence.toString().padStart(4, '0')}`;
}

export async function addBillableService(jobId: string, productId: string, quantity: number) {
    try {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { property: true }
        });
        if (!job) throw new Error("Job not found");

        // 1. Find or Create Draft Invoice
        let invoice = await prisma.invoice.findFirst({
            where: {
                jobId: jobId,
                status: 'DRAFT' // Only add to DRAFT
            },
            include: { items: true }
        });

        if (!invoice) {
            const number = await generateInvoiceNumber(job.division);
            invoice = await prisma.invoice.create({
                data: {
                    jobId,
                    clientId: job.property.clientId,
                    status: 'DRAFT',
                    division: job.division,
                    number: number,
                    issuedDate: new Date(),
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
                },
                include: { items: true }
            });
        }

        // 2. Add Item
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) throw new Error("Product not found");

        await prisma.invoiceItem.create({
            data: {
                invoiceId: invoice.id,
                productId,
                quantity,
                price: product.price, // Use current product price
                description: product.name, // Default description
                unitCost: product.cost,
                taxRate: 0 // Default tax? Should come from system settings or product? Assuming 0 for now.
            }
        });

        // 3. Update Invoice Total
        const items = await prisma.invoiceItem.findMany({ where: { invoiceId: invoice.id } });
        const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        await prisma.invoice.update({
            where: { id: invoice.id },
            data: { total }
        });

        // 4. Update Job Net Selling Price?
        // Usually derived from Invoice, but Job has a field `netSellingPrice`.
        // We should keep it in sync.
        await prisma.job.update({
            where: { id: jobId },
            data: { netSellingPrice: total }
        });

        // Trigger real-time cost update
        await calculateJobCosts(jobId);

        revalidatePath(`/jobs/${jobId}`);
        return { success: true };
    } catch (error) {
        console.error("Error adding billable service:", error);
        return { success: false, error: "Failed to add service" };
    }
}

export async function removeBillableService(itemId: string, jobId: string) {
    try {
        const item = await prisma.invoiceItem.findUnique({ where: { id: itemId } });
        if (!item) return { success: false };

        const invoiceId = item.invoiceId;
        await prisma.invoiceItem.delete({ where: { id: itemId } });

        // Update Total using raw query or re-fetching?
        // Re-fetch is safer logic
        const remainingItems = await prisma.invoiceItem.findMany({ where: { invoiceId } });
        const total = remainingItems.reduce((sum, i) => sum + (i.quantity * i.price), 0);

        await prisma.invoice.update({
            where: { id: invoiceId },
            data: { total }
        });

        // Sync Job Net Price
        await prisma.job.update({
            where: { id: jobId },
            data: { netSellingPrice: total }
        });

        // Trigger real-time cost update
        await calculateJobCosts(jobId);

        revalidatePath(`/jobs/${jobId}`);
        return { success: true };
    } catch (error) {
        console.error("Error removing billable service:", error);
        return { success: false };
    }
}
