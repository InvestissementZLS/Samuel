const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const samuel = await prisma.client.findFirst({
        where: { name: { contains: 'Samuel Leveille', mode: 'insensitive' } },
        include: { invoices: { include: { items: { include: { product: true } } } } }
    });

    if (!samuel) {
        console.log("Samuel Leveille non trouvé");
        return;
    }

    let foundProducts = [];
    for (const inv of samuel.invoices) {
        for (const item of inv.items) {
            if (item.product && (item.product.name.toLowerCase().includes('arrosage') || item.product.name.toLowerCase().includes('plan annuel') || item.product.name.toLowerCase().includes('prévention'))) {
                foundProducts.push(item.product);
            }
        }
    }

    if (foundProducts.length === 0) {
        console.log("Aucun produit de prévention trouvé dans les factures de Samuel Leveille.");
        return;
    }

    const firstProperty = await prisma.property.findFirst({
        where: { clientId: samuel.id, isDeleted: false },
        orderBy: { createdAt: 'asc' }
    });

    if (!firstProperty) {
        console.log("Aucune propriété trouvée pour Samuel.");
        return;
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
                propertyId: firstProperty.id,
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
