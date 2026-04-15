/**
 * seed-services.ts
 * Run with: npx ts-node seed-services.ts
 * Or from repo root: cd packages/db && npx ts-node prisma/seed-services.ts
 *
 * Upserts all Extermination ZLS services with full descriptions.
 * Safe to run multiple times — uses upsert by name.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const services = [
    // ─── OUVERTURE DE DOSSIER ─────────────────────────────────────────────────
    {
        name: 'Ouverture de Dossier',
        description:
            'Ouverture et gestion du dossier client incluant l\'analyse initiale et le suivi administratif. Dossier valide pour une durée de 6 mois.',
        warrantyInfo: 'Dossier valide 6 mois',
        price: 0,
        unit: 'forfait',
        durationMinutes: 30,
    },

    // ─── SOURIS ───────────────────────────────────────────────────────────────
    {
        name: 'Traitement Souris – Régulier',
        description:
            'Service régulier pour l\'identification et le traitement des zones d\'infestation de souris. ' +
            'Inclut l\'installation de poison pour l\'élimination complète des souris actives, l\'installation et l\'entretien des dispositifs de contrôle dans toute la maison (salle mécanique, sorties de plomberie, toutes zones avec activité observée). ' +
            'Visite de suivi après 1 mois si nécessaire — aucun frais supplémentaire si la problématique persiste.',
        warrantyInfo: 'Garantie 6 mois',
        price: 0,
        unit: 'visite',
        durationMinutes: 60,
    },
    {
        name: 'Traitement Souris – Premium',
        description:
            'Service complet incluant piégeage, contrôle et élimination. ' +
            'Phase initiale : pièges mécaniques + périmètre extérieur autour du bâtiment + pièges stratégiques à l\'intérieur + pièges dans les soffites et grenier. ' +
            'Révision des pièges après 2 semaines. ' +
            'Traitement principal : installation de poison pour élimination complète de la colonie.',
        warrantyInfo: 'Garantie 6 mois',
        price: 0,
        unit: 'forfait',
        durationMinutes: 120,
    },
    {
        name: 'Calfeutrage & Blocage Complet – Souris',
        description:
            'Blocage des accès et traitement complet pour éliminer et prévenir les infestations.\n\n' +
            '① Scellement à la base : silicone durable (portes/fenêtres), calfeutrage fondation/revêtement, grillage anti-nuisible (si requis).\n' +
            '② Traitement en hauteur : silicone entre revêtement et soffite, vérification des faiblesses structurelles.\n' +
            '③ Inspection complémentaire : identification de tous les points d\'entrée, scellement additionnel si requis.\n' +
            '④ Élimination de la colonie : stations de poison sécurisées (sous évier, salle mécanique, garage, grenier).\n\n' +
            'Produit utilisé : CONTRAC All-Weather BLOX — Bromadiolone 0.005%.',
        warrantyInfo: 'Garantie 2 ans contre les souris | 5 ans sur les matériaux (calfeutrage & grillage)',
        price: 0,
        unit: 'forfait',
        durationMinutes: 180,
    },
    {
        name: 'Service Mensuel – Rongeurs',
        description:
            'Service d\'entretien mensuel pour le contrôle des rongeurs. ' +
            'Inclut l\'installation de stations d\'appât, trappes collantes et traitement ciblé dans les zones stratégiques.',
        warrantyInfo: '',
        price: 0,
        unit: 'mois',
        durationMinutes: 45,
    },
    {
        name: 'Service Trimestriel – Rongeurs',
        description:
            'Contrôle préventif trimestriel contre les nuisibles. Inspection et traitement tous les 3 mois pour maintenir un périmètre sécurisé.',
        warrantyInfo: '',
        price: 0,
        unit: 'trimestre',
        durationMinutes: 60,
    },
    {
        name: 'Traitement Annuel – Souris',
        description:
            'Programme annuel de prévention et de contrôle contre les souris. ' +
            'Inclut 3 visites de suivi, rafraîchissement des appâts et vérification complète des installations.',
        warrantyInfo: 'Garantie 1 an',
        price: 0,
        unit: 'an',
        durationMinutes: 60,
    },

    // ─── GUÊPES & INSECTES EXTÉRIEURS ────────────────────────────────────────
    {
        name: 'Arrosage Extérieur',
        description:
            'Traitement préventif contre les insectes extérieurs. ' +
            'Zones traitées : soffites, contour des portes et fenêtres, périmètre extérieur. ' +
            'Produit : Dragnet (ingrédient actif : perméthrine, 50 ml / 4L d\'eau). ' +
            'Centre antipoison : 1-800-463-4010.',
        warrantyInfo: '',
        price: 0,
        unit: 'visite',
        durationMinutes: 60,
    },
    {
        name: 'Plan Annuel – Arrosage Extérieur',
        description:
            'Programme préventif saisonnier contre insectes rampants et volants. ' +
            '3 traitements extérieurs (mi-mai à fin août, espacés de 1.5 à 2 mois). ' +
            'Zones : base de la maison, portes et fenêtres, soffites. ' +
            'Couvre : nids de guêpes, fourmis, araignées, perce-oreilles et autres insectes. ' +
            'Intervention gratuite si infestation pendant la saison. ' +
            'Paiement : 50% avant premier traitement, balance après première visite. ' +
            'Centre antipoison : 1-800-463-5060.',
        warrantyInfo: 'Garantie saison complète — intervention gratuite si infestation',
        price: 0,
        unit: 'saison',
        durationMinutes: 60,
    },
    {
        name: 'Traitement Guêpes – Nid',
        description:
            'Traitement et élimination d\'un nid de guêpes. Inclut le traitement du nid et l\'extraction si possible.',
        warrantyInfo: 'Garantie 3 mois',
        price: 0,
        unit: 'nid',
        durationMinutes: 60,
    },
    {
        name: 'Traitement Guêpes – Nid de Terre',
        description:
            'Traitement ciblé des nids de guêpes au sol. Élimination du nid et extraction si possible.',
        warrantyInfo: 'Garantie 3 mois',
        price: 0,
        unit: 'nid',
        durationMinutes: 60,
    },
    {
        name: 'Service Complet – Guêpes',
        description:
            'Service complet contre infestation de guêpes. ' +
            'Inclut : traitement intérieur, deux traitements extérieurs et calfeutrage complet. ' +
            'Centre antipoison : 1-800-463-5060.',
        warrantyInfo: 'Garantie 1 an',
        price: 0,
        unit: 'forfait',
        durationMinutes: 120,
    },

    // ─── FOURMIS CHARPENTIÈRES ────────────────────────────────────────────────
    {
        name: 'Fourmis Charpentières – Forfait Standard',
        description:
            'Traitement avec appâts spécialisés contre les fourmis charpentières. ' +
            '2 visites d\'appâtage intérieur et extérieur + 1 traitement extérieur.',
        warrantyInfo: 'Garantie 3 mois',
        price: 640,
        unit: 'forfait',
        durationMinutes: 90,
    },
    {
        name: 'Fourmis Charpentières – Forfait Premium',
        description:
            'Traitement complet renforcé contre les fourmis charpentières. ' +
            '2 visites d\'appâtage intérieur et extérieur + 3 traitements extérieurs.',
        warrantyInfo: 'Garantie 1 an',
        price: 975,
        unit: 'forfait',
        durationMinutes: 120,
    },

    // ─── COQUERELLES ──────────────────────────────────────────────────────────
    {
        name: 'Traitement Appât – Coquerelles',
        description:
            'Traitement ciblé par appâts contre les coquerelles. ' +
            'Application dans cuisine, salle de bain et électroménagers. ' +
            'Élimination progressive de toute la colonie.',
        warrantyInfo: '',
        price: 0,
        unit: 'traitement',
        durationMinutes: 60,
    },
    {
        name: 'Traitement Choc – Coquerelles',
        description:
            'Traitement intensif pour infestation majeure de coquerelles. ' +
            'Inspection initiale avec pièges collants. ' +
            'Traitement : insecticide aérosol + insecticide liquide + insecticide en poudre, appliqués dans murs, fissures et moulures. ' +
            'Suivi hebdomadaire avec ajustement du traitement selon l\'évolution. ' +
            'Centre antipoison : 1-800-463-5060.',
        warrantyInfo: 'Garantie 1 an',
        price: 0,
        unit: 'forfait',
        durationMinutes: 90,
    },

    // ─── PUNAISES DE LIT ──────────────────────────────────────────────────────
    {
        name: 'Punaises de Lit – Traitement Dragnet + Konk',
        description:
            'Traitement combiné pour l\'élimination des punaises de lit. ' +
            'Application de Dragnet dans moulures et fissures pour créer un périmètre de traitement. ' +
            'Application de Konk 407 pour un effet immédiat. ' +
            'Résultat : élimination des punaises et larves au contact, réduction rapide de l\'infestation.',
        warrantyInfo: '',
        price: 0,
        unit: 'traitement',
        durationMinutes: 90,
    },
    {
        name: 'Punaises de Lit – Aprehend (Biologique)',
        description:
            'Traitement biologique longue durée contre les punaises de lit. ' +
            'Application dans moulures et zones de passage. ' +
            'Le produit se transmet entre punaises, actif jusqu\'à 3 mois. ' +
            'Mortalité observée en 4 à 7 jours.',
        warrantyInfo: 'Actif jusqu\'à 3 mois',
        price: 0,
        unit: 'traitement',
        durationMinutes: 90,
    },

    // ─── ANIMAUX SAUVAGES ────────────────────────────────────────────────────
    {
        name: 'Capture Animaux Sauvages',
        description:
            'Capture et relocalisation sécuritaire d\'animaux sauvages (écureuil, marmotte, moufette, rat). ' +
            'Installation de cages appâtées. Relocalisation à plus de 20 km. ' +
            'Suivi jusqu\'à capture complète.',
        warrantyInfo: '',
        price: 0,
        unit: 'animal',
        durationMinutes: 60,
    },
    {
        name: 'Blocage Marmotte / Moufette',
        description:
            'Blocage permanent des accès sous structures pour marmottes et moufettes. ' +
            'Travaux : tranchée de 2 pieds de profondeur × 2 pieds de largeur avec installation de grillage galvanisé sous la structure. ' +
            'Suivi par caméra et visites.',
        warrantyInfo: 'Garantie 5 ans',
        price: 0,
        unit: 'forfait',
        durationMinutes: 180,
    },
    {
        name: 'Installation Cage + Caméra',
        description:
            'Surveillance complète de l\'activité animale. ' +
            'Installation d\'une cage appâtée et d\'une caméra de surveillance. ' +
            'Suivi jusqu\'à résolution complète du problème.',
        warrantyInfo: '',
        price: 0,
        unit: 'forfait',
        durationMinutes: 60,
    },

    // ─── INSPECTION ──────────────────────────────────────────────────────────
    {
        name: 'Inspection',
        description:
            'Inspection complète pour identifier le type et le niveau d\'infestation. ' +
            'Rapport détaillé avec recommandations de traitement.',
        warrantyInfo: '',
        price: 0,
        unit: 'visite',
        durationMinutes: 60,
    },
    {
        name: 'Inspection Canine – Punaises',
        description:
            'Inspection spécialisée avec chien détecteur entraîné pour détecter les punaises de lit. ' +
            'Méthode non-invasive et hautement précise.',
        warrantyInfo: '',
        price: 0,
        unit: 'visite',
        durationMinutes: 60,
    },
];

async function main() {
    console.log(`\n🚀 Seeding ${services.length} Extermination ZLS services...\n`);

    let created = 0;
    let updated = 0;

    for (const service of services) {
        const existing = await prisma.product.findFirst({
            where: { name: service.name, division: 'EXTERMINATION' },
        });

        if (existing) {
            await prisma.product.update({
                where: { id: existing.id },
                data: {
                    description: service.description,
                    warrantyInfo: service.warrantyInfo,
                    price: service.price,
                    unit: service.unit,
                    durationMinutes: service.durationMinutes,
                    type: 'SERVICE',
                    division: 'EXTERMINATION',
                },
            });
            console.log(`  ✏️  Updated: ${service.name}`);
            updated++;
        } else {
            await prisma.product.create({
                data: {
                    name: service.name,
                    description: service.description,
                    warrantyInfo: service.warrantyInfo,
                    price: service.price,
                    unit: service.unit,
                    durationMinutes: service.durationMinutes,
                    type: 'SERVICE',
                    division: 'EXTERMINATION',
                },
            });
            console.log(`  ✅ Created: ${service.name}`);
            created++;
        }
    }

    console.log(`\n✔️  Done — ${created} created, ${updated} updated.\n`);
}

main()
    .then(async () => { await prisma.$disconnect(); })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
