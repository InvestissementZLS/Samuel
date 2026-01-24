
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const invoiceNumber = 'ENT-2026-5031';
    console.log(`Adjusting Invoice ${invoiceNumber}...`);

    const invoice = await prisma.invoice.findFirst({
        where: { number: invoiceNumber },
        include: { items: { include: { product: true } } }
    });

    if (!invoice) {
        console.error('Invoice not found!');
        return;
    }

    // Define targets
    const targetQty = 1800;

    // We want to preserve the individual line totals from the "Inspection" step to keep the math clean.
    // Previous inspection:
    // [0] Removal: 2000 * 0.9 = 1800
    // [1] Replacement: 2000 * 3.35 = 6700
    // Total = 8500

    // New Calc:
    // [0] Removal: Target 1800 / 1800 qty = $1.00/unit
    // [1] Replacement: Target 6700 / 1800 qty = $3.722222...

    const updates = [
        {
            description: "Insulation removal",
            targetTotal: 1800,
            newPrice: 1.00
        },
        {
            description: "Insulation replacement",
            targetTotal: 6700,
            newPrice: 6700 / 1800 // ~3.7222
        }
    ];

    for (const item of invoice.items) {
        const update = updates.find(u => item.description?.includes(u.description) || item.product.name.includes(u.description));

        if (update) {
            console.log(`Updating ${item.description || item.product.name}...`);
            console.log(`  Old: ${item.quantity} * ${item.price} = ${item.quantity * item.price}`);
            console.log(`  New: ${targetQty} * ${update.newPrice} = ${targetQty * update.newPrice}`);

            await prisma.invoiceItem.update({
                where: { id: item.id },
                data: {
                    quantity: targetQty,
                    price: update.newPrice
                }
            });
        }
    }

    // Recalculate Invoice Total
    // subtotal 8500. Tax is usually calculated on top.
    // Invoice model stores 'total' which includes tax? 
    // Let's check schema/logic. logic in 'convertJobToInvoice' was:
    // tax = ... 
    // total = taxable + tax
    // The script needs to update the invoice 'total' field too.

    // Re-fetch items to be sure
    const updatedItems = await prisma.invoiceItem.findMany({ where: { invoiceId: invoice.id } });
    const subtotal = updatedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    // Tax logic (assuming Quebec taxes as per invoice PDF analysis previously)
    // GST 5%, QST 9.975% = 14.975%
    // Or check invoice.tax field?
    const taxRate = invoice.tax || 14.975;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    console.log(`New Subtotal: ${subtotal}`);
    console.log(`New Total: ${total}`);

    await prisma.invoice.update({
        where: { id: invoice.id },
        data: { total: total }
    });

    console.log('Invoice updated.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
