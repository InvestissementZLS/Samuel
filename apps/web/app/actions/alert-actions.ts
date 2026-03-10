'use server';

import { prisma } from '@/lib/prisma';
import { addDays, subDays, subMonths, subYears } from 'date-fns';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertCategory = 'quote' | 'warranty' | 'visit' | 'invoice' | 'client';

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
                linkHref: `/quotes/${q.id}`,
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
            alerts.push({
                id: `followup-${job.id}`,
                category: 'visit',
                severity: isPast ? 'critical' : 'warning',
                title: isPast ? `Visite de suivi en retard` : `Visite de suivi à confirmer`,
                description: `${job.property?.client?.name || 'Client'} — ${serviceName}${isPast ? ` (${daysAgo}j de retard)` : ''}`,
                clientId: job.property?.clientId,
                clientName: job.property?.client?.name,
                linkHref: `/jobs/${job.id}`,
                daysAgo: isPast ? daysAgo : undefined,
            });
        }

        // ─── 5. Factures impayées depuis +30j ─────────────────────────────
        const overdueInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ['SENT', 'OVERDUE'] },
                createdAt: { lt: subDays(today, 30) },
                ...(division && division !== 'ALL' ? { division: division as any } : {})
            },
            include: { client: true },
            orderBy: { createdAt: 'asc' },
            take: 10,
        });

        for (const inv of overdueInvoices) {
            const daysAgo = Math.floor((today.getTime() - new Date(inv.createdAt).getTime()) / 86400000);
            alerts.push({
                id: `invoice-overdue-${inv.id}`,
                category: 'invoice',
                severity: daysAgo > 60 ? 'critical' : 'warning',
                title: `Facture #${inv.number || inv.id.slice(0, 6)} impayée`,
                description: `${inv.client?.name || 'Client'} — ${inv.total.toFixed(2)}$ — ${daysAgo}j sans paiement`,
                clientId: inv.clientId,
                clientName: inv.client?.name,
                linkHref: `/invoices/${inv.id}`,
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
                const daysAgo = lastJob
                    ? Math.floor((today.getTime() - new Date(lastJob.scheduledAt).getTime()) / 86400000)
                    : 365;

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

    } catch (err) {
        console.error('[AlertActions] Error computing alerts:', err);
    }

    // Sort: critical first, then by category priority
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    const categoryOrder = { visit: 0, warranty: 1, quote: 2, invoice: 3, client: 4 };

    return alerts.sort((a, b) => {
        const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (sevDiff !== 0) return sevDiff;
        return categoryOrder[a.category] - categoryOrder[b.category];
    });
}
