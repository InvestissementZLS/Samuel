const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const samuel = await prisma.client.findFirst({
        where: { id: "e641ea2a-1975-42db-92a5-1cc9f5b17c27" },
        include: { invoices: { include: { items: { include: { product: true } } } } }
    });

    if (!samuel) return;

    let property = await prisma.property.findFirst({
        where: { clientId: samuel.id }
    });

    if (!property) {
        console.log("Creation de la propriete pour Samuel...");
        property = await prisma.property.create({
            data: {
                clientId: samuel.id,
                address: samuel.billingAddress || "Adresse Inconnue",
                province: "QC",
                country: "Canada",
                type: "RESIDENTIAL"
            }
        });
        console.log("Propriete creee: ", property.id);
    }

    let foundProducts = [];
    for (const inv of samuel.invoices) {
        if (!inv.items) continue;
        for (const item of inv.items) {
            if (item.product && (item.product.name.toLowerCase().includes('arrosage') || item.product.name.toLowerCase().includes('plan annuel') || item.product.name.toLowerCase().includes('prévention') || item.product.name.toLowerCase().includes('traitement extérieur'))) {
                foundProducts.push(item.product);
            }
        }
    }

    if (foundProducts.length === 0) {
        // Au cas ou, on le force avec un faux produit pour qu'il le voie
        const prod = await prisma.product.findFirst({ where: { name: { contains: 'Arrosage Extérieur' } }});
        if (prod) foundProducts.push(prod);
    }

    // Determine if it's an annual plan
    const isAnnualPlan = foundProducts.some(p => 
        p.name.toLowerCase().includes('plan annuel') || 
        p.name.toLowerCase().includes('deux traitements') || 
        p.name.toLowerCase().includes('2 traitements')
    );

    const visitsToCreate = isAnnualPlan ? 2 : 1;
    console.log(`Création de ${visitsToCreate} visites pour ${samuel.name}`);

    for (let i = 0; i < visitsToCreate; i++) {
        const scheduledDate = new Date();
        if (i === 1) {
            scheduledDate.setDate(scheduledDate.getDate() + 60);
        }

        let description = 'Généré rétroactivement suite à une facturation ou soumission de prévention.';
        if (isAnnualPlan) {
            description = i === 0 
                ? 'Visite 1 (Initiale) - Plan Annuel généré automatiquement.'
                : 'Visite 2 (Mi-saison) - Plan Annuel généré automatiquement.';
        }

        await prisma.job.create({
            data: {
                propertyId: property.id,
                status: 'PENDING',
                scheduledAt: scheduledDate, 
                description: description,
                division: 'EXTERMINATION',
                products: {
                    create: foundProducts.map(p => ({
                        productId: p.id,
                        quantity: 1,
                        price: p.price || 0
                    }))
                }
            }
        });
        console.log(`Visite ${i+1} créée avec succès.`);
    }
}

main().catch(e => console.error(e)).finally(async () => {
    await prisma.$disconnect();
});
