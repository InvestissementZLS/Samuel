const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicates() {
    console.log("🧹 Démarrage du nettoyage des doublons...");

    // 1. Récupérer tous les clients de la division EXTERMINATION
    const allClients = await prisma.client.findMany({
        where: { divisions: { has: 'EXTERMINATION' } },
        orderBy: { createdAt: 'asc' }
    });

    // 2. Grouper par nom exact (en ignorant la casse)
    const clientsByName = new Map();

    for (const client of allClients) {
        const nameKey = client.name.trim().toLowerCase();
        if (!clientsByName.has(nameKey)) {
            clientsByName.set(nameKey, []);
        }
        clientsByName.get(nameKey).push(client);
    }

    let mergedCount = 0;
    let deletedCount = 0;

    // 3. Fusionner les groupes de plus de 1 client
    for (const [name, group] of clientsByName.entries()) {
        if (group.length > 1) {
            console.log(`\nFusion de ${group.length} profils pour: "${group[0].name}"`);

            // Le premier client (le plus ancien) sera le client principal
            const mainClient = group[0];
            const duplicateIds = group.slice(1).map(c => c.id);

            // Consolider les emails et téléphones (garder le premier valide)
            let finalEmail = mainClient.email;
            let finalPhone = mainClient.phone;

            for (let i = 1; i < group.length; i++) {
                if (!finalEmail && group[i].email) finalEmail = group[i].email;
                if (!finalPhone && group[i].phone) finalPhone = group[i].phone;
            }

            if (finalEmail !== mainClient.email || finalPhone !== mainClient.phone) {
                await prisma.client.update({
                    where: { id: mainClient.id },
                    data: { email: finalEmail, phone: finalPhone }
                });
            }

            // Transférer toutes les relations vers le client principal
            // a) Propriétés
            await prisma.property.updateMany({
                where: { clientId: { in: duplicateIds } },
                data: { clientId: mainClient.id }
            });

            // b) Devis
            await prisma.quote.updateMany({
                where: { clientId: { in: duplicateIds } },
                data: { clientId: mainClient.id }
            });

            // c) Factures
            await prisma.invoice.updateMany({
                where: { clientId: { in: duplicateIds } },
                data: { clientId: mainClient.id }
            });

            // d) Notes
            /* 
            await prisma.clientNote.updateMany({
                where: { clientId: { in: duplicateIds } },
                data: { clientId: mainClient.id }
            });
            */

            // Finalement, supprimer les doublons
            await prisma.client.deleteMany({
                where: { id: { in: duplicateIds } }
            });

            mergedCount++;
            deletedCount += duplicateIds.length;
        }
    }

    console.log(`\n✅ Nettoyage terminé ! ${mergedCount} groupes fusionnés, ${deletedCount} doublons supprimés.`);
}

cleanupDuplicates()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
