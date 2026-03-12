import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Creating test user, product, inventory, and job...");
    const user = await prisma.user.create({
        data: { email: 'test_inv_' + Date.now() + '@example.com', name: 'Test Tech' }
    });

    const product = await prisma.product.create({
        data: { name: 'Test Chemical', unit: 'Bottle', type: 'CONSUMABLE' }
    });

    const inventory = await prisma.inventoryItem.create({
        data: { productId: product.id, userId: user.id, quantity: 10 }
    });

    const client = await prisma.client.create({
        data: { name: 'Test Client' }
    });

    const property = await prisma.property.create({
        data: { clientId: client.id, address: '123 Test St' }
    });

    const job = await prisma.job.create({
        data: { propertyId: property.id, scheduledAt: new Date(), status: 'IN_PROGRESS' }
    });

    console.log("Adding product usage (0.5 units)...");
    try {
        await prisma.$transaction(async (tx) => {
            const qty = 0.5;
            await tx.usedProduct.create({
                data: { jobId: job.id, productId: product.id, quantity: qty }
            });

            await tx.inventoryItem.update({
                where: { id: inventory.id },
                data: { quantity: { decrement: qty } }
            });
        });
        console.log("Success! Inventory updated.");
    } catch (e) {
        console.error("Prisma Error:", e.message);
    }

    const finalInv = await prisma.inventoryItem.findUnique({ where: { id: inventory.id } });
    console.log("Final Inventory Quantity:", finalInv?.quantity);

    // Cleanup
    await prisma.usedProduct.deleteMany({ where: { jobId: job.id } });
    await prisma.job.delete({ where: { id: job.id } });
    await prisma.property.delete({ where: { id: property.id } });
    await prisma.client.delete({ where: { id: client.id } });
    await prisma.inventoryItem.delete({ where: { id: inventory.id } });
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.user.delete({ where: { id: user.id } });
}

main().finally(() => prisma.$disconnect());
