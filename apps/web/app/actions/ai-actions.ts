'use server';

import { prisma } from '@/lib/prisma';
import { Division } from '@prisma/client';

export type AIActionType = 'RENEWAL' | 'RECOVERY' | 'VIP_INVITE' | 'INVENTORY_ALERT' | 'PROFITABILITY_WARNING';

export interface AIInsight {
    id: string;
    type: AIActionType;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    data: any;
    actionLabel: string;
}

export async function generateAIInsights(division: Division = 'EXTERMINATION'): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    try {
        // --- 1. CASHFLOW RETRIEVER (Recouvrement) ---
        const overdueInvoices = await prisma.invoice.findMany({
            where: {
                division,
                status: { in: ['OVERDUE', 'SENT'] },
                total: { gt: 0 }
            },
            include: { client: true }
        });

        if (overdueInvoices.length > 0) {
            const totalDue = overdueInvoices.reduce((sum, inv) => sum + (inv.total - (inv.amountPaid || 0)), 0);
            insights.push({
                id: `recovery-${Date.now()}`,
                type: 'RECOVERY',
                priority: 'HIGH',
                title: '💰 Argent dormant détecté',
                description: `J'ai trouvé ${overdueInvoices.length} factures impayées totalisant ${totalDue.toFixed(2)}$. Doit-on envoyer un courriel de relance avec lien Square ?`,
                data: { invoiceIds: overdueInvoices.map(i => i.id), totalDue, count: overdueInvoices.length },
                actionLabel: 'Relancer tous les retards avec Square'
            });
        }

        // --- 2. UPSELL RÉCURRENCE (Renouvellement) ---
        // On cible les factures/jobs d'apparence récurrente de l'historique GorillaDesk
        const historicalInvoices = await prisma.invoice.findMany({
            where: {
                division,
                OR: [
                    { description: { contains: 'Monthly', mode: 'insensitive' } },
                    { description: { contains: 'Annual', mode: 'insensitive' } },
                    { notes: { contains: 'Monthly', mode: 'insensitive' } }
                ]
            },
            include: { client: true },
            take: 20
        });

        // Remove duplicates internally
        const uniqueClients = Array.from(new Set(historicalInvoices.map(i => i.clientId)));

        if (uniqueClients.length > 0) {
            insights.push({
                id: `renewal-${Date.now()}`,
                type: 'RENEWAL',
                priority: 'MEDIUM',
                title: '🔄 Opportunités de renouvellement',
                description: `J'ai isolé ${uniqueClients.length} clients qui devraient recevoir un traitement de routine basé sur leur historique. Veux-tu leur préparer un devis ?`,
                data: { clientIds: uniqueClients, count: uniqueClients.length },
                actionLabel: 'Créer devis & offres'
            });
        }

        // --- 3. INVITATIONS VIP ---
        const totalClients = await prisma.client.count({ where: { divisions: { has: division } } });
        if (totalClients > 50) {
            insights.push({
                id: `vip-${Date.now()}`,
                type: 'VIP_INVITE',
                priority: 'LOW',
                title: '🎟️ Lancement du Portail VIP',
                description: `Ta base de ${totalClients} clients est à jour. Je peux envoyer une campagne courriel pour leur donner accès à leur portail privé Praxis.`,
                data: { count: totalClients },
                actionLabel: 'Lancer la campagne d\'invitation VIP'
            });
        }

        // --- 4. SURVEILLANT D'INVENTAIRE ---
        // On alerte sur les produits dont le stock principal (warehouse = userId: null) est très bas (<= 10)
        const lowStockItems = await prisma.inventoryItem.findMany({
            where: {
                userId: null,
                quantity: { lte: 10 }
            },
            include: { product: true }
        });

        if (lowStockItems.length > 0) {
            insights.push({
                id: `inventory-${Date.now()}`,
                type: 'INVENTORY_ALERT',
                priority: 'HIGH',
                title: '📦 Alertes de rupture de stock',
                description: `J'ai détecté ${lowStockItems.length} produits en quantité critique dans ton entrepôt (ex: ${lowStockItems[0].product.name}). Il faudrait planifier une commande fournisseur.`,
                data: { items: lowStockItems.map(i => ({ name: i.product.name, qty: i.quantity })), count: lowStockItems.length },
                actionLabel: 'Créer bon de commande fournisseur'
            });
        }

        // --- 5. OPTIMISEUR DE RENTABILITÉ ---
        // On cherche les jobs récents complétés dont le coût total > revenue facturé
        const unprofitableJobs = await prisma.job.findMany({
            where: {
                division,
                status: 'COMPLETED',
                totalJobCost: { gt: 0 },
                netSellingPrice: { gt: 0 },
                // Jobs où le coût est >= 90% du prix de vente (marge < 10%)
            },
            include: {
                property: { include: { client: true } },
                invoices: { select: { total: true, status: true } }
            },
            orderBy: { completedAt: 'desc' },
            take: 50
        });

        const lowMarginJobs = unprofitableJobs.filter(job => {
            const revenue = job.netSellingPrice;
            const cost = job.totalJobCost;
            return cost > 0 && revenue > 0 && (cost / revenue) >= 0.90; // marge < 10%
        });

        if (lowMarginJobs.length > 0) {
            const missedRevenue = lowMarginJobs.reduce((sum, job) => sum + Math.max(0, job.totalJobCost - job.netSellingPrice), 0);
            insights.push({
                id: `profitability-${Date.now()}`,
                type: 'PROFITABILITY_WARNING',
                priority: 'HIGH',
                title: '💰 Jobs sous-rentables détectés',
                description: `J’ai analysé tes ${unprofitableJobs.length} derniers jobs complétés. ${lowMarginJobs.length} ont une marge bénéficiaire inférieure à 10%, représentant ${missedRevenue.toFixed(2)}$ de profit manqué.`,
                data: {
                    jobs: lowMarginJobs.slice(0, 5).map(j => ({
                        id: j.id,
                        client: j.property?.client?.name || 'Inconnu',
                        cost: j.totalJobCost,
                        revenue: j.netSellingPrice,
                        margin: (((j.netSellingPrice - j.totalJobCost) / j.netSellingPrice) * 100).toFixed(1)
                    })),
                    count: lowMarginJobs.length,
                    missedRevenue
                },
                actionLabel: 'Voir les recommandations de prix'
            });
        }

    } catch (error) {
        console.error("AI Insights Error:", error);
    }

    // Trier par priorité (HIGH d'abord)
    const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return insights.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
}

// Actions exécutables (à connecter réellement aux API tierces plus tard)
export async function executeAIAction(actionId: string, type: AIActionType, data: any) {
    // Simulation d'une action complexe (ex: envoi de courriel Square, devis, etc.)
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true, message: "L'instruction a été transmise aux directeurs de département." };
}
