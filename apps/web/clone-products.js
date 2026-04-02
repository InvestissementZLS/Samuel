const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Cloning catalog across all divisions...");
    
    // Fetch the 20 clean standard extermination products we just made
    const productsToClone = await prisma.product.findMany({
        where: {
            division: "EXTERMINATION",
            name: { not: "Service Importé" }
        }
    });

    const otherDivisions = ["ENTREPRISES", "RENOVATION"];

    let newCount = 0;

    for (const division of otherDivisions) {
        for (const prod of productsToClone) {
            // Check if it already exists
            const existing = await prisma.product.findFirst({
                where: { name: prod.name, division }
            });

            if (!existing) {
                await prisma.product.create({
                    data: {
                        name: prod.name,
                        price: prod.price,
                        type: prod.type,
                        unit: prod.unit,
                        division: division,
                        description: `Catalogue ZLS standard - ${division}`
                    }
                });
                newCount++;
            }
        }
    }

    console.log(`✅ Success! Cloned ${newCount} products into ENTREPRISES and RENOVATION.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
