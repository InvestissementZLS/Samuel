
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const invoiceNumber = 'ENT-2026-5031';
    console.log(`Inspecting Invoice ${invoiceNumber}...`);

    const invoice = await prisma.invoice.findFirst({
        where: { number: invoiceNumber },
        include: { items: { include: { product: true } } }
    });

    if (!invoice) {
        console.error('Invoice not found! Searching by generic ID/Date/Division just in case...');
        const fallback = await prisma.invoice.findFirst({
            where: { division: 'RENOVATION' },
            orderBy: { createdAt: 'desc' },
            include: { items: { include: { product: true } } }
        });
        if (fallback) {
            console.log(`Found generic fallback: ${fallback.number}`);
            logItems(fallback);
        } else {
            console.error('No fallback found.');
        }
        return;
    }

    logItems(invoice);
}

function logItems(invoice: any) {
    console.log(`Invoice ID: ${invoice.id}`);
    console.log(`Current Total: ${invoice.total}`);
    console.log('Items:');
    invoice.items.forEach((item: any, i: number) => {
        console.log(`[${i}] Product: ${item.product.name}`);
        console.log(`    Description: ${item.description}`);
        console.log(`    Qty: ${item.quantity}`);
        console.log(`    Price: ${item.price}`);
        console.log(`    Line Total: ${item.quantity * item.price}`);
        console.log('---');
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
