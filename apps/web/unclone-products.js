const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Removing the cloned products from ENTREPRISES and RENOVATION...");
    
    const result = await prisma.product.deleteMany({
        where: {
            division: {
                in: ["ENTREPRISES", "RENOVATION"]
            }
        }
    });

    console.log(`✅ Success! Deleted ${result.count} products from the other divisions.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
