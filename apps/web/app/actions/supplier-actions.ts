'use server';

import { prisma } from '@/lib/prisma';

// Action de mise à jour en lot des coûts d'achat fournisseur
export async function updateProductCostsFromSupplier(
    products: Array<{ name: string; cost: number; unit?: string; sku?: string }>
): Promise<{ updated: number; created: number; skipped: number; errors: string[] }> {
    let updated = 0;
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of products) {
        try {
            if (!item.name || item.cost <= 0) {
                skipped++;
                continue;
            }

            // Tenter de trouver un produit existant par nom similaire
            const existing = await prisma.product.findFirst({
                where: {
                    name: {
                        contains: item.name.trim(),
                        mode: 'insensitive'
                    }
                }
            });

            if (existing) {
                // Mettre à jour le coût du produit existant
                await prisma.product.update({
                    where: { id: existing.id },
                    data: { cost: item.cost }
                });
                updated++;
            } else {
                // Créer un nouveau produit avec les infos du fournisseur
                await prisma.product.create({
                    data: {
                        name: item.name.trim(),
                        cost: item.cost,
                        price: item.cost * 2.5, // Markup par défaut de 150% si nouveau
                        unit: item.unit || 'unité',
                        division: 'EXTERMINATION',
                        type: 'CONSUMABLE',
                    }
                });
                created++;
            }
        } catch (error: any) {
            errors.push(`${item.name}: ${error.message}`);
        }
    }

    return { updated, created, skipped, errors };
}

// Récupérer les stats globales d'inventaire pour l'IA
export async function getInventoryStats() {
    const [totalProducts, lowStockCount, zeroStockCount] = await Promise.all([
        prisma.product.count({ where: { type: 'CONSUMABLE' } }),
        prisma.inventoryItem.count({
            where: { userId: null, quantity: { lte: 10, gt: 0 } }
        }),
        prisma.inventoryItem.count({
            where: { userId: null, quantity: 0 }
        }),
    ]);

    const avgCost = await prisma.product.aggregate({
        where: { cost: { gt: 0 } },
        _avg: { cost: true }
    });

    return {
        totalProducts,
        lowStockCount,
        zeroStockCount,
        averageCost: avgCost._avg.cost || 0
    };
}
