const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const singleId = "8ed78213-1dd2-4e9b-9843-876028ad9da4"; // Arrosage Extérieur
const annualId = "b21e0aa2-9d76-4efa-94d0-69062090279d"; // Plan Annuel

const rawData = `Alex Hill			2 arrosages restant (déjà payé forfait 2 charpentiere)
Benoit Lefebvre			1 arrosage restant (déjà payé forfait 2 charpentiere)
Carole Lanoue			1 arrosage restant (forfait 1 charpentiere)
Catharina Van Hilst			2 arrosages restant (forfait 2 charpentiere) (payés)
David Lavoie			1 arrosage restant (déjà payé forfait 2 charpentière)
David Riopel			1 arrosage restant (déjà payé forfait 2 charpentière)
Denis Gagné			2 arrosages restant (déjà payé forfait 2 charpentiere)
Doris Larose			1 arrosage restant (déjà payé forfait 2 charpentiere)
Éric Bastien			1 arrosage restant (déjà payé forfait 1 charpentière)
Estelle Major			2 arrosages restant (payer 2/3 de la facture forfait 2 charpentiere)
Francis Croisetière			1 ou 2 arrosages restants à vérifier
Françoise Beaudry-Riendeau			vérifier s'il en reste 1. 
Gabriel Aupin			1 arrosage restant (déjà payé)
Hugo dutil fafard			1 arrosage restant (déjà payé)
Invester Inc.			1 ou 2 arrosages restant (déjà payé)
isabelle contant			1 arrosage restant (déjà payé)
jessica brière			a verifier avec elle (cash)
johanne thibodeau			1 arrosage restant (déjà payé)
ken (295 rue boyd)			2 arrosages restant (déjà payé)
lisa lipari			1 arroage restant (déjà payé)
Dominique Lemay			reste 1 shooting (déjà payé)
martin mantha			2 arrosages restants (déjà payé)
marianne germain			1 arrosage restant deja payé (shooter sous-sol aussi et contacter a ́l'avance la cliente)
marie-andrée poliquin			1 arrosage restant deja payée`;

async function main() {
    const lines = rawData.split('\n').filter(l => l.trim().length > 0);

    for (const line of lines) {
        const parts = line.split('\t').filter(p => p.trim() !== '');
        if (parts.length === 0) continue;
        
        let clientName = parts[0].trim();
        let searchName = clientName;
        if (clientName.includes('(')) {
            searchName = clientName.split('(')[0].trim();
        }

        const matches = await prisma.client.findMany({
            where: { name: { contains: searchName, mode: 'insensitive' } },
            include: { properties: true }
        });

        if (matches.length > 0) {
            const client = matches[0];
            const notes = parts.length > 1 ? parts[1] : "";
            
            // Extract number of visits
            let visitsToCreate = 1;
            let productId = singleId;
            let titlePrefix = "Visite 1 (Initiale) - Service simple";
            
            if (notes.includes('2 arrosage') || notes.includes('2 charpentiere') && !notes.includes('1 arrosage') && !notes.includes('reste 1')) {
                visitsToCreate = 2;
                productId = annualId;
                titlePrefix = "Plan Annuel";
            }
            if (notes.toLowerCase().includes('1 ou 2 arrosages') || notes.toLowerCase().includes('1 arrosage')) {
                visitsToCreate = 1;
                productId = singleId;
                titlePrefix = "Arrosage Extérieur";
            }

            // Ensure property exists
            let property = client.properties.length > 0 ? client.properties[0] : null;
            if (!property) {
                const addressStr = client.billingAddress || "";
                const pcMatch = addressStr.match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/i);
                const postalCode = pcMatch ? pcMatch[0].toUpperCase().replace(/\s/g, '') : null;

                property = await prisma.property.create({
                    data: {
                        clientId: client.id,
                        address: addressStr || "Adresse inconnue",
                        postalCode: postalCode,
                        type: "RESIDENTIAL",
                        province: "QC",
                        country: "Canada"
                    }
                });
            }

            console.log(`Traitement de ${client.name}... (${visitsToCreate} visites)`);

            for (let i = 0; i < visitsToCreate; i++) {
                const scheduledDate = new Date();
                if (i === 1) {
                    scheduledDate.setDate(scheduledDate.getDate() + 60);
                }

                let description = `IMPORTATION - ${notes}`;
                
                await prisma.job.create({
                    data: {
                        propertyId: property.id,
                        status: 'PENDING',
                        scheduledAt: scheduledDate, 
                        description: `[Importé] Visite ${i+1}/${visitsToCreate} - ${notes}`,
                        division: 'EXTERMINATION',
                        products: {
                            create: [{
                                productId: productId,
                                quantity: 1,
                                price: 0
                            }]
                        }
                    }
                });
            }
        }
    }
    console.log("Importation complétée !");
}

main().catch(e => console.error(e)).finally(async () => {
    await prisma.$disconnect();
});
