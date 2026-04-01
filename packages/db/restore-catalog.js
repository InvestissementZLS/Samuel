process.env.DATABASE_URL = "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1";
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    console.log("Saving products...");
    const raw = fs.readFileSync('c:/Users/samue/OneDrive/Desktop/Antigravity - Folder/tmp/final_catalog_utf8.json', 'utf-8');
    const items = JSON.parse(raw.trim().replace(/^\uFEFF/, ''));
    
    let c = 0;
    for (const item of items) {
        if(!item.name) continue;
        const existing = await prisma.product.findFirst({ where: { name: item.name }});
        const data = {
            name: item.name,
            description: item.description || "",
            price: item.price || 0,
            type: "SERVICE",
            division: "EXTERMINATION",
            unit: "VISIT",
            warrantyInfo: item.warrantyInfo || null,
        };
        if (!existing) {
            await prisma.product.create({ data });
        } else {
            await prisma.product.update({ where: { id: existing.id }, data });
        }
        c++;
    }
    console.log("Restored", c, "products.");
}
main().catch(console.error).finally(()=>prisma.$disconnect());
