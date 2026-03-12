import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const catalog = [
  {
    "name": "Traitement de souris - Régulier",
    "description": "Visite unique pour l'identification et le traitement. Installation de poison pour l'élimination complète.",
    "price": 450,
    "warrantyInfo": "6 mois",
    "pestType": "MICE",
    "type": "SERVICE",
    "division": "EXTERMINATION",
    "unit": "VISIT"
  },
  {
    "name": "Traitement de souris - Premium",
    "description": "Phase initiale de piégeage mécanique + traitement principal avec poison.",
    "price": 625,
    "warrantyInfo": "6 mois",
    "pestType": "MICE",
    "type": "SERVICE",
    "division": "EXTERMINATION",
    "unit": "VISIT"
  },
  {
    "name": "Contrôle de rats",
    "description": "Installation de trappes mécaniques, évaluation de l'activité et réduction de la population.",
    "price": 300,
    "pestType": "RAT",
    "type": "SERVICE",
    "division": "EXTERMINATION",
    "unit": "VISIT"
  },
  {
    "name": "Fourmis Charpentières - Forfait 1",
    "description": "Traitement choc intérieur + 1 arrosage extérieur.",
    "price": 675,
    "warrantyInfo": "3 mois",
    "pestType": "ANTS",
    "seasonStartMonth": 4,
    "seasonEndMonth": 8,
    "type": "SERVICE",
    "division": "EXTERMINATION",
    "unit": "VISIT"
  },
  {
    "name": "Fourmis Charpentières - Forfait 2",
    "description": "Traitement choc intérieur + 3 arrosages extérieurs (saison été).",
    "price": 975,
    "warrantyInfo": "1 an",
    "pestType": "ANTS",
    "seasonStartMonth": 4,
    "seasonEndMonth": 8,
    "type": "SERVICE",
    "division": "EXTERMINATION",
    "unit": "VISIT"
  },
  {
    "name": "Guêpes - Nid visible",
    "description": "Extermination et extraction d'un nid visible facile d'accès.",
    "price": 175,
    "warrantyInfo": "3 mois",
    "pestType": "WASPS",
    "seasonStartMonth": 6,
    "seasonEndMonth": 10,
    "type": "SERVICE",
    "division": "EXTERMINATION",
    "unit": "VISIT"
  },
  {
    "name": "Guêpes - Mur intérieur",
    "description": "Extermination nid dans mur intérieur (selon difficulté).",
    "price": 400,
    "warrantyInfo": "3 mois",
    "pestType": "WASPS",
    "seasonStartMonth": 6,
    "seasonEndMonth": 10,
    "type": "SERVICE",
    "division": "EXTERMINATION",
    "unit": "VISIT"
  },
  {
    "name": "Traitement Aprehend (Punaises de lit)",
    "description": "Traitement biologique (champignon). Reste actif 3 mois. Élimination progressive.",
    "price": 0,
    "warrantyInfo": "1 an",
    "pestType": "BEDBUGS",
    "type": "SERVICE",
    "division": "EXTERMINATION",
    "unit": "VISIT"
  },
  {
    "name": "Punaises de lit - Traitement choc",
    "description": "Application de Dragnet et Konk 407. Nécessite souvent 3 à 4 visites.",
    "price": 800,
    "warrantyInfo": "1 an",
    "pestType": "BEDBUGS",
    "type": "SERVICE",
    "division": "EXTERMINATION",
    "unit": "VISIT"
  },
  {
    "name": "Capture Écureuil / Raton",
    "description": "Installation de cages, monitoring (caméra) et relocalisation (min 20km).",
    "price": 650,
    "pestType": "OTHER",
    "type": "SERVICE",
    "division": "EXTERMINATION",
    "unit": "VISIT"
  },
  {
    "name": "Calfeutrage accès en hauteur",
    "description": "Scellement entre revêtement et soffites (prévention guêpes/rongeurs).",
    "price": 650,
    "warrantyInfo": "5 ans",
    "pestType": "OTHER",
    "type": "SERVICE",
    "division": "EXTERMINATION",
    "unit": "VISIT"
  }
];

async function main() {
  console.log('Seeding products from refined catalog (fixed Schema)...');
  for (const item of catalog) {
    const existing = await prisma.product.findFirst({
      where: { name: item.name }
    });

    if (!existing) {
      // @ts-ignore
      await prisma.product.create({ data: item });
      console.log(`Created: ${item.name}`);
    } else {
      // @ts-ignore
      await prisma.product.update({ 
        where: { id: existing.id }, 
        data: item 
      });
      console.log(`Updated: ${item.name}`);
    }
  }
  console.log('Seeding complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
