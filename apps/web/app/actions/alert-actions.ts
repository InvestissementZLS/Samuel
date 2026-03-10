'use server';

import { prisma } from '@/lib/prisma';
import { addDays, subDays, subMonths, subYears, startOfMonth } from 'date-fns';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertCategory = 'quote' | 'warranty' | 'visit' | 'invoice' | 'client' | 'inventory' | 'profitability' | 'marketing';

export interface DashboardAlert {
    id: string;
    category: AlertCategory;
    severity: AlertSeverity;
    title: string;
    description: string;
    clientId?: string;
    clientName?: string;
    linkHref?: string;
    daysAgo?: number;
    daysLeft?: number;
}

const today = new Date();

export async function getDashboardAlerts(division?: string): Promise<DashboardAlert[]> {
    const alerts: DashboardAlert[] = [];

    const divFilter = (div: string) =>
        !division || division === 'ALL' ? undefined : div === division ? div : undefined;

    try {
        // ─── 1. Devis en attente depuis +7 jours ───────────────────────────
        const staleSentQuotes = await prisma.quote.findMany({
            where: {
                status: 'SENT',
                updatedAt: { lt: subDays(today, 7) },
                ...(division && division !== 'ALL' ? { division: division as any } : {})
            },
            include: { client: true },
            orderBy: { updatedAt: 'asc' },
            take: 10,
        });

        for (const q of staleSentQuotes) {
            const daysSent = Math.floor((today.getTime() - new Date(q.updatedAt).getTime()) / 86400000);
            alerts.push({
                id: `quote-stale-${q.id}`,
                category: 'quote',
                severity: daysSent > 14 ? 'critical' : 'warning',
                title: `Devis #${q.number || q.id.slice(0, 6)} sans réponse`,
                description: `${q.client?.name || 'Client'} — Envoyé il y a ${daysSent} jours`,
                clientId: q.clientId,
                clientName: q.client?.name,
                linkHref: `/quotes?quoteId=${q.id}`,
                daysAgo: daysSent,
            });
        }

        // ─── 2. Garanties qui expirent dans 30 jours ──────────────────────
        const expiringWarranties = await prisma.property.findMany({
            where: {
                warrantyExpiresAt: {
                    gte: today,
                    lte: addDays(today, 30),
                }
            },
            include: { client: true },
            take: 15,
        });

        for (const prop of expiringWarranties) {
            const daysLeft = Math.floor((new Date(prop.warrantyExpiresAt!).getTime() - today.getTime()) / 86400000);
            alerts.push({
                id: `warranty-exp-${prop.id}`,
                category: 'warranty',
                severity: daysLeft <= 7 ? 'critical' : 'warning',
                title: `Garantie expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
                description: `${prop.client?.name || 'Client'} — ${prop.address}`,
                clientId: prop.clientId,
                clientName: prop.client?.name,
                linkHref: `/clients/${prop.clientId}`,
                daysLeft,
            });
        }

        // ─── 3. Garanties expirées récemment (< 60j) ──────────────────────
        const recentlyExpired = await prisma.property.findMany({
            where: {
                warrantyExpiresAt: {
                    gte: subDays(today, 60),
                    lt: today,
                }
            },
            include: { client: true },
            take: 10,
        });

        for (const prop of recentlyExpired) {
            const daysAgo = Math.floor((today.getTime() - new Date(prop.warrantyExpiresAt!).getTime()) / 86400000);
            alerts.push({
                id: `warranty-expired-${prop.id}`,
                category: 'warranty',
                severity: daysAgo <= 14 ? 'critical' : 'info',
                title: `Garantie expirée — Renouvellement possible`,
                description: `${prop.client?.name || 'Client'} — Expirée il y a ${daysAgo} jour${daysAgo > 1 ? 's' : ''}`,
                clientId: prop.clientId,
                clientName: prop.client?.name,
                linkHref: `/clients/${prop.clientId}`,
                daysAgo,
            });
        }

        // ─── 4. Visites de suivi (jobs enfants) non encore planifiées ──────
        const pendingFollowups = await prisma.job.findMany({
            where: {
                parentJobId: { not: null },
                status: 'PENDING',
                scheduledAt: { lt: addDays(today, 3) }, // dans les 3 prochains jours ou en retard
                ...(division && division !== 'ALL' ? { division: division as any } : {})
            },
            include: {
                property: { include: { client: true } },
                products: { include: { product: true }, take: 1 }
            },
            orderBy: { scheduledAt: 'asc' },
            take: 10,
        });

        for (const job of pendingFollowups) {
            const isPast = new Date(job.scheduledAt) < today;
            const daysAgo = isPast ? Math.floor((today.getTime() - new Date(job.scheduledAt).getTime()) / 86400000) : 0;
            const serviceName = job.products[0]?.product?.name || 'Suivi';
            const address = job.property?.address || '';
            
            // Try to find if it's a "Follow-up #X" from the description
            const match = job.description?.match(/Follow-up #(\d+)/i);
            const sequenceText = match ? ` (${match[0]})` : '';

            const phone = job.property?.client?.phone ? ` (${job.property.client.phone})` : '';

            alerts.push({
                id: `followup-${job.id}`,
                category: 'visit',
                severity: isPast ? 'critical' : 'warning',
                title: isPast ? `Visite de suivi en retard` : `Visite de suivi à confirmer`,
                description: `${job.property?.client?.name || 'Client'}${phone} — ${serviceName}${sequenceText} — ${address}${isPast ? ` (${daysAgo}j de retard)` : ''}`,
                clientId: job.property?.clientId,
                clientName: job.property?.client?.name,
                linkHref: `/jobs/${job.id}`,
                daysAgo: isPast ? daysAgo : undefined,
            });
        }

        // ─── 5. Factures impayées depuis +30j ─────────────────────────────
        const overdueInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] },
                createdAt: { lt: subDays(today, 1) }, // Any unpaid after 1 day? Or keep 30? User said "imoayer" (impayé). Usually 30j is standard for "overdue". I'll keep 15j for a good balance.
                ...(division && division !== 'ALL' ? { division: division as any } : {})
            },
            include: { client: true },
            orderBy: { createdAt: 'asc' },
            take: 100,
        });

        const groupedInvoices: Record<string, {
            clientName: string,
            phone: string,
            total: number,
            count: number,
            oldestDate: Date,
            clientId: string
        }> = {};

        for (const inv of overdueInvoices) {
            if (!groupedInvoices[inv.clientId]) {
                groupedInvoices[inv.clientId] = {
                    clientName: inv.client?.name || 'Client',
                    phone: inv.client?.phone || '',
                    total: 0,
                    count: 0,
                    oldestDate: inv.createdAt,
                    clientId: inv.clientId
                };
            }
            const balance = inv.total - (inv.amountPaid || 0);
            if (balance > 0) {
                groupedInvoices[inv.clientId].total += balance;
                groupedInvoices[inv.clientId].count += 1;
                if (inv.createdAt < groupedInvoices[inv.clientId].oldestDate) {
                    groupedInvoices[inv.clientId].oldestDate = inv.createdAt;
                }
            }
        }

        for (const clientId in groupedInvoices) {
            const group = groupedInvoices[clientId];
            if (group.count === 0) continue;

            const daysAgo = Math.floor((today.getTime() - new Date(group.oldestDate).getTime()) / 86400000);
            const phoneText = group.phone ? ` (${group.phone})` : '';
            const invoicesText = group.count > 1 ? `${group.count} factures` : `Facture #${overdueInvoices.find(i => i.clientId === clientId)?.number || '?'}`;

            alerts.push({
                id: `invoice-overdue-group-${clientId}`,
                category: 'invoice',
                severity: daysAgo > 60 ? 'critical' : 'warning',
                title: `Client avec impayés : ${group.total.toFixed(2)}$`,
                description: `${group.clientName}${phoneText} — ${invoicesText} — Somme due depuis ${daysAgo}j`,
                clientId: group.clientId,
                clientName: group.clientName,
                linkHref: `/invoices?clientId=${group.clientId}`, // Filter invoices by client
                daysAgo,
            });
        }

        // ─── 6. Clients sans visite depuis +1 an ──────────────────────────
        const oneYearAgo = subYears(today, 1);
        const activeClients = await prisma.client.findMany({
            where: {
                ...(division && division !== 'ALL' ? { divisions: { has: division as any } } : {})
            },
            include: {
                properties: {
                    include: {
                        jobs: {
                            orderBy: { scheduledAt: 'desc' },
                            take: 1,
                        }
                    }
                }
            },
            take: 200,
        });

        for (const client of activeClients) {
            const lastJob = client.properties
                .flatMap(p => p.jobs)
                .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];

            if (!lastJob || new Date(lastJob.scheduledAt) < oneYearAgo) {
                // Si pas de job, regarder depuis combien de temps le client a été créé
                const daysAgo = lastJob
                    ? Math.floor((today.getTime() - new Date(lastJob.scheduledAt).getTime()) / 86400000)
                    : Math.floor((today.getTime() - new Date(client.createdAt).getTime()) / 86400000);

                if (daysAgo >= 365) {
                    alerts.push({
                        id: `client-inactive-${client.id}`,
                        category: 'client',
                        severity: 'info',
                        title: `Client inactif depuis ${Math.floor(daysAgo / 30)} mois`,
                        description: `${client.name} — Potentiel de renouvellement`,
                        clientId: client.id,
                        clientName: client.name,
                        linkHref: `/clients/${client.id}`,
                        daysAgo,
                    });
                }
            }
        }

        // ─── 7. Alertes d'inventaire critique (Entrepôt) ──────────────────
        const lowStock = await prisma.inventoryItem.findMany({
            where: {
                userId: null,
                quantity: { lte: 10 },
            },
            include: { product: true },
            take: 10,
        });

        for (const item of lowStock) {
            alerts.push({
                id: `inv-low-${item.id}`,
                category: 'inventory',
                severity: item.quantity <= 2 ? 'critical' : 'warning',
                title: `Stock critique : ${item.product.name}`,
                description: `Il ne reste que ${item.quantity} ${item.product.unit || 'unités'} à l'entrepôt. Pensez à commander.`,
                linkHref: `/inventory`,
            });
        }

        // ─── 8. Alertes de rentabilité (Jobs complétés < 10% marge) ────────
        const lowMarginJobs = await prisma.job.findMany({
            where: {
                status: 'COMPLETED',
                completedAt: { gte: subDays(today, 7) },
                netSellingPrice: { gt: 0 },
                totalJobCost: { gt: 0 },
                ...(division && division !== 'ALL' ? { division: division as any } : {})
            },
            include: { property: { include: { client: true } } },
            take: 10,
        });

        for (const job of lowMarginJobs) {
            const margin = (job.netSellingPrice - job.totalJobCost) / job.netSellingPrice;
            if (margin < 0.10) {
                alerts.push({
                    id: `margin-low-${job.id}`,
                    category: 'profitability',
                    severity: margin < 0 ? 'critical' : 'warning',
                    title: `Job peu rentable : ${job.property?.client?.name || 'Client'}`,
                    description: `Marge de ${(margin * 100).toFixed(1)}% sur le dernier job. coût: ${job.totalJobCost.toFixed(2)}$ / prix: ${job.netSellingPrice.toFixed(2)}$.`,
                    clientId: job.property?.clientId,
                    clientName: job.property?.client?.name,
                    linkHref: `/jobs/${job.id}`,
                });
            }
        }

        // ─── 9. Opportunités de croissance (Clients Fourmis de l'an dernier) ─
        // Focus sur la saison des fourmis (Mars à Juin)
        const currentMonth = today.getMonth() + 1;
        if (currentMonth >= 3 && currentMonth <= 6) {
            const lastYearStart = subYears(subMonths(today, today.getMonth()), 1); // Début d'année dernière
            const lastYearEnd = addDays(lastYearStart, 365);

            // Clients ayant eu un service "Fourmis" l'an dernier
            const pastAntJobs = await prisma.job.findMany({
                where: {
                    status: 'COMPLETED',
                    scheduledAt: { gte: subDays(today, 400), lte: subDays(today, 300) }, // Fenêtre approximative
                    products: { some: { product: { pestType: 'ANTS' } } },
                    ...(division && division !== 'ALL' ? { division: division as any } : {})
                },
                include: { property: { include: { client: true } } },
                take: 15,
            });

            for (const job of pastAntJobs) {
                const clientId = job.property.clientId;
                // Vérifier s'ils ont déjà un job prévu cette année
                const hasCurrentJob = await prisma.job.count({
                    where: {
                        property: { clientId },
                        scheduledAt: { gte: startOfMonth(subMonths(today, 2)) }, 
                        products: { some: { product: { pestType: 'ANTS' } } }
                    }
                });

                if (hasCurrentJob === 0) {
                    alerts.push({
                        id: `upsell-ants-${clientId}`,
                        category: 'marketing',
                        severity: 'info',
                        title: `Opportunité Fourmis : ${job.property.client.name}`,
                        description: `Client traité l'an dernier à cette date. Proposez-leur un traitement préventif dès maintenant.`,
                        clientId: clientId,
                        clientName: job.property.client.name,
                        linkHref: `/clients/${clientId}`,
                    });
                }
            }
        }

    } catch (err) {
        console.error('[AlertActions] Error computing alerts:', err);
    }

    // Sort: critical first, then by category priority
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    const categoryOrder = { visit: 0, profitability: 1, inventory: 2, warranty: 3, quote: 4, invoice: 5, client: 6, marketing: 7 };

    return alerts.sort((a, b) => {
        const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (sevDiff !== 0) return sevDiff;
        return (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99);
    });
}
