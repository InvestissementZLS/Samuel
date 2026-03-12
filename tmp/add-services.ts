import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const services = [
  {
    name: "Traitement Fourmis Charpentières",
    description: "Traitement complet contre les fourmis charpentières avec garantie. Application extérieure et intérieure.",
    price: 350,
    type: "SERVICE",
    division: "EXTERMINATION",
    seasonStartMonth: 4, // Avril
    seasonEndMonth: 8,   // Août
    isRecurring: true,
    numberOfVisits: 2
  },
  {
    name: "Traitement Araignées (Extérieur)",
    description: "Barrière protectrice contre les araignées pour tout le tour de la maison.",
    price: 180,
    type: "SERVICE",
    division: "EXTERMINATION",
    seasonStartMonth: 5, // Mai
    seasonEndMonth: 9,   // Septembre
    isRecurring: true,
    numberOfVisits: 1
  },
  {
    name: "Traitement Punaises de Lit",
    description: "Éradication complète des punaises de lit. Prix par chambre. Nécessite 2 à 3 visites.",
    price: 450,
    type: "SERVICE",
    division: "EXTERMINATION",
    isRecurring: true,
    numberOfVisits: 3
  },
  {
    name: "Contrôle de Rongeurs (Souris/Rats)",
    description: "Identification des points d'entrée et mise en place de stations d'appâtage sécurisées.",
    price: 225,
    type: "SERVICE",
    division: "EXTERMINATION",
    isRecurring: true,
    numberOfVisits: 2
  },
  {
    name: "Nid de Guêpes / Frelons",
    description: "Destruction sécurisée d'un nid de guêpes ou frelons avec garantie de résultat.",
    price: 150,
    type: "SERVICE",
    division: "EXTERMINATION",
    seasonStartMonth: 6, // Juin
    seasonEndMonth: 10,  // Octobre
    isRecurring: false,
    numberOfVisits: 1
  },
  {
    name: "Calfeutrage Anti-Parasitaire",
    description: "Scellage des ouvertures pour prévenir l'entrée des souris et autres insectes.",
    price: 0, // Prix sur devis habituellement, mais on peut mettre un de base
    type: "SERVICE",
    division: "EXTERMINATION",
    isRecurring: false,
    numberOfVisits: 1
  }
];

async function main() {
  console.log('Adding services...');
  for (const s of services) {
    const existing = await prisma.product.findFirst({
      where: { name: s.name }
    });
    if (!existing) {
      // @ts-ignore
      await prisma.product.create({ data: s });
      console.log(`Added: ${s.name}`);
    } else {
      console.log(`Exists: ${s.name}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
