import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const newProducts = [
  { name: "Inspection Résidentielle", price: 150, type: "SERVICE" },
  { name: "Inspection Commerciale", price: 175, type: "SERVICE" },
  { name: "Frais de Déplacement / Ouverture de Dossier", price: 75, type: "SERVICE" },
  { name: "Rabais / Déduction", price: 0, type: "SERVICE" },
  { name: "Traitement Extérieur Préventif (Arrosage)", price: 250, type: "SERVICE" },
  { name: "Traitement Intérieur (Ciblé)", price: 175, type: "SERVICE" },
  { name: "Traitement Fourmis Charpentières", price: 675, type: "SERVICE" },
  { name: "Traitement Choc - Punaises de lit", price: 800, type: "SERVICE" },
  { name: "Traitement Choc - Coquerelles / Blattes", price: 500, type: "SERVICE" },
  { name: "Traitement Rongeurs (Appâts et Trappes)", price: 450, type: "SERVICE" },
  { name: "Inspection Caméra et Grenier", price: 250, type: "SERVICE" },
  { name: "Blocage et Calfeutrage Préventif (Souris/Mulots)", price: 0, type: "SERVICE" },
  { name: "Capture et Relocalisation (Raton, Écureuil, Marmotte)", price: 150, type: "SERVICE" },
  { name: "Installation de Trappe d'Exclusion (One-way door)", price: 400, type: "EQUIPMENT" },
  { name: "Blocage et Calfeutrage Accès en Hauteur", price: 650, type: "SERVICE" },
  { name: "Traitement Nid de Guêpes (Visible)", price: 175, type: "SERVICE" },
  { name: "Fumigation Sous Terre ou Mur (Guêpes)", price: 250, type: "SERVICE" },
  { name: "Service Mensuel d'Entretien", price: 250, type: "SERVICE" },
  { name: "Service Bi-Mensuel d'Entretien", price: 175, type: "SERVICE" },
  { name: "Contrat d'Entretien Annuel", price: 0, type: "SERVICE" }
];

async function main() {
    console.log("🧹 Starting Clean-up of EXTERMINATION Products...");

    // 1. Fetch all EXTERMINATION products except the "Service Importé"
    const productsToDelete = await prisma.product.findMany({
        where: { 
            division: "EXTERMINATION",
            name: { not: "Service Importé" }
        }
    });

    console.log(`Found ${productsToDelete.length} products to attempt to delete.`);

    // 2. Safely attempt to delete them (will fail if linked to existing invoices)
    let deletedCount = 0;
    let retainedCount = 0;
    for (const prod of productsToDelete) {
        try {
            await prisma.product.delete({ where: { id: prod.id } });
            deletedCount++;
        } catch (e) {
            // Foreign key constraint failed -> meaning it is attached to a real invoice!
            retainedCount++;
        }
    }
    console.log(`✅ Deleted ${deletedCount} unused products. (Retained ${retainedCount} linked to historic data)`);

    // 3. Insert the clean "Master" array
    let insertedCount = 0;
    for (const data of newProducts) {
        // Check if exists safely
        const existing = await prisma.product.findFirst({ where: { name: data.name, division: "EXTERMINATION" } });
        if (!existing) {
            await prisma.product.create({
                data: {
                    name: data.name,
                    price: data.price,
                    type: data.type as any,
                    unit: "unité",
                    division: "EXTERMINATION",
                    description: "Catalogue ZLS standard"
                }
            });
            insertedCount++;
        }
    }
    console.log(`✨ Inserted ${insertedCount} Master Services!`);
    console.log("Done.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
