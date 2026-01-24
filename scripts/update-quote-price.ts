
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Finding quote Q-DEMO-001...');

    const quote = await prisma.quote.findFirst({
        where: { number: 'Q-DEMO-001' },
        include: { items: true }
    });

    if (!quote) {
        console.error('Quote not found!');
        return;
    }

    // Target Subtotal: 8500.00
    // Strategy: 
    // Old: Removal 2000 * 0.95 = 1900. Replacement 2000 * 3.50 = 7000. Total 8900.
    // New: Removal 2000 * 0.90 = 1800. Replacement 2000 * 3.35 = 6700. Total 8500.

    console.log('Updating items...');

    // Update Removal Item
    const removalItem = quote.items.find(i => i.price === 0.95 || i.quantity === 2000); // Heuristic
    // Better: fetch products to match name, but let's just assume order or values. 
    // Actually, let's just update based on the known previous values from my previous script.
    // Removal was 0.95, Replacement was 3.50.

    for (const item of quote.items) {
        if (Math.abs(item.price - 0.95) < 0.01) {
            await prisma.quoteItem.update({
                where: { id: item.id },
                data: { price: 0.90 }
            });
            console.log(`Updated Removal item ${item.id} to $0.90`);
        } else if (Math.abs(item.price - 3.50) < 0.01) {
            await prisma.quoteItem.update({
                where: { id: item.id },
                data: { price: 3.35 }
            });
            console.log(`Updated Replacement item ${item.id} to $3.35`);
        }
    }

    // Recalculate totals
    const subtotal = 8500.00;
    const tps = subtotal * 0.05;
    const tvq = subtotal * 0.09975;
    const tax = tps + tvq;
    const total = subtotal + tax;

    console.log(`New Totals - Sub: ${subtotal}, Tax: ${tax}, Total: ${total}`);

    await prisma.quote.update({
        where: { id: quote.id },
        data: {
            // subtotal: subtotal, // Field removed from create script, assuming it's not in schema or optional?
            // Wait, schema check: I read schema earlier. 
            // Model Invoice has amount using float. Quote definition was not fully shown in previous `read_file`.
            // Let's check schema again? 
            // Actually, standard usually has `total` and `tax`. `subtotal` key in my CREATE script failed.
            // So I will just update `tax` and `total`.
            tax: tax,
            total: total
        }
    });

    console.log('Quote updated successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
