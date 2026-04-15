/**
 * cleanup-services.ts
 * Deletes all old/duplicate services (desc="Catalogue ZLS standard..." or "Service importé")
 * and keeps only the 23 properly seeded services.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// These are the KEEP list — names from our seed
const KEEP = new Set([
    'Ouverture de Dossier',
    'Traitement Souris – Régulier',
    'Traitement Souris – Premium',
    'Calfeutrage & Blocage Complet – Souris',
    'Service Mensuel – Rongeurs',
    'Service Trimestriel – Rongeurs',
    'Traitement Annuel – Souris',
    'Arrosage Extérieur',
    'Plan Annuel – Arrosage Extérieur',
    'Traitement Guêpes – Nid',
    'Traitement Guêpes – Nid de Terre',
    'Service Complet – Guêpes',
    'Fourmis Charpentières – Forfait Standard',
    'Fourmis Charpentières – Forfait Premium',
    'Traitement Appât – Coquerelles',
    'Traitement Choc – Coquerelles',
    'Punaises de Lit – Traitement Dragnet + Konk',
    'Punaises de Lit – Aprehend (Biologique)',
    'Capture Animaux Sauvages',
    'Blocage Marmotte / Moufette',
    'Installation Cage + Caméra',
    'Inspection',
    'Inspection Canine – Punaises',
]);

async function main() {
    const all = await prisma.product.findMany({
        where: { division: 'EXTERMINATION' },
        select: { id: true, name: true, type: true }
    });

    const toDelete = all.filter(p => !KEEP.has(p.name));

    console.log(`\n🗑️  Deleting ${toDelete.length} old/duplicate entries:\n`);
    for (const p of toDelete) {
        console.log(`  ❌ [${p.type}] ${p.name}`);
    }

    // Delete JobProduct references first to avoid FK errors
    const ids = toDelete.map(p => p.id);
    if (ids.length > 0) {
        // Remove job associations
        try { await (prisma as any).jobProduct.deleteMany({ where: { productId: { in: ids } } }); } catch {}
        // Remove quote line items
        try { await (prisma as any).quoteLineItem.deleteMany({ where: { productId: { in: ids } } }); } catch {}
        try { await (prisma as any).quoteItem.deleteMany({ where: { productId: { in: ids } } }); } catch {}
        // Remove invoice line items
        try { await (prisma as any).invoiceLineItem.deleteMany({ where: { productId: { in: ids } } }); } catch {}
        try { await (prisma as any).invoiceItem.deleteMany({ where: { productId: { in: ids } } }); } catch {}
        // Remove series steps
        try { await (prisma as any).seriesStep.deleteMany({ where: { productId: { in: ids } } }); } catch {}
        // Delete products
        await prisma.product.deleteMany({ where: { id: { in: ids } } });
    }

    const remaining = await prisma.product.findMany({
        where: { division: 'EXTERMINATION' },
        orderBy: { name: 'asc' },
        select: { name: true, type: true, price: true }
    });

    console.log(`\n✅ Remaining services (${remaining.length}):\n`);
    for (const p of remaining) {
        console.log(`  ✅ [${p.type}] ${p.name} | $${p.price}`);
    }
    console.log('\n✔️  Cleanup done.\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
