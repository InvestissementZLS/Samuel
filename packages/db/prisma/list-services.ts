import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const all = await prisma.product.findMany({
        where: { division: 'EXTERMINATION' },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, type: true, price: true, description: true, warrantyInfo: true }
    });
    console.log(`\nTotal products (EXTERMINATION): ${all.length}\n`);
    for (const p of all) {
        console.log(`[${p.type}] ${p.name} | $${p.price} | desc:${p.description ? p.description.slice(0,40)+'...' : 'EMPTY'} | warranty:${p.warrantyInfo || 'NONE'}`);
    }
}
main().finally(() => prisma.$disconnect());
