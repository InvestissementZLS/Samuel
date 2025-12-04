import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing Invoicing Logic...');
    try {
        // 1. Setup Data
        const client = await prisma.client.create({
            data: { name: 'Invoice Client', email: `inv-client-${Date.now()}@example.com` }
        });

        const product = await prisma.product.create({
            data: { name: 'Test Product', price: 100, unit: 'each' }
        });

        // 2. Create Invoice
        const invoice = await prisma.invoice.create({
            data: {
                clientId: client.id,
                status: 'DRAFT',
                total: 0
            }
        });
        console.log('Created invoice:', invoice.id);

        // 3. Add Item (Simulate Action Logic)
        // Action: create item, then update invoice total
        await prisma.invoiceItem.create({
            data: {
                invoiceId: invoice.id,
                productId: product.id,
                quantity: 2,
                price: product.price
            }
        });

        // Recalculate total
        const items = await prisma.invoiceItem.findMany({ where: { invoiceId: invoice.id } });
        const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoice.id },
            data: { total }
        });
        console.log('Updated invoice total:', updatedInvoice.total);

        if (updatedInvoice.total === 200) {
            console.log('SUCCESS: Total calculated correctly (2 * 100 = 200).');
        } else {
            console.error('FAILURE: Total calculation incorrect.');
        }

        // 4. Remove Item
        const item = items[0];
        await prisma.invoiceItem.delete({ where: { id: item.id } });

        // Recalculate
        const itemsAfter = await prisma.invoiceItem.findMany({ where: { invoiceId: invoice.id } });
        const totalAfter = itemsAfter.reduce((sum, item) => sum + (item.quantity * item.price), 0);

        const finalInvoice = await prisma.invoice.update({
            where: { id: invoice.id },
            data: { total: totalAfter }
        });
        console.log('Final invoice total:', finalInvoice.total);

        if (finalInvoice.total === 0) {
            console.log('SUCCESS: Total reset to 0 after item removal.');
        } else {
            console.error('FAILURE: Total calculation after removal incorrect.');
        }

        // Cleanup
        await prisma.invoice.delete({ where: { id: invoice.id } });
        await prisma.product.delete({ where: { id: product.id } });
        await prisma.client.delete({ where: { id: client.id } });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
