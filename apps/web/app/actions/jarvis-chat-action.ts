'use server';

import { prisma } from '@/lib/prisma';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { subDays, subMonths, addDays } from 'date-fns';

export async function askJarvis(question: string, division?: string): Promise<{ answer: string; error?: string }> {
    if (!question?.trim()) return { answer: '' };

    const now = new Date();
    const divFilter = division ? { division: division as any } : {};
    const divClientFilter = division ? { divisions: { has: division as any } } : {};

    try {
        // Fetch relevant live data based on keywords in question
        const [
            overdueInvoices,
            unpaidTotal,
            clientsNoJob,
            unassignedJobs,
            recurringDue,
            topClients,
            recentJobs,
            technicianStats,
        ] = await Promise.all([
            prisma.invoice.findMany({
                where: { isDeleted: false, status: { in: ['OVERDUE', 'SENT'] } },
                include: { client: { select: { name: true, phone: true } } },
                orderBy: { total: 'desc' },
                take: 10,
            }),
            prisma.invoice.aggregate({
                where: { isDeleted: false, status: { in: ['OVERDUE', 'SENT'] } },
                _sum: { total: true },
            }),
            prisma.client.findMany({
                where: {
                    isDeleted: false,
                    ...divClientFilter,
                    properties: {
                        some: {
                            isDeleted: false,
                            jobs: {
                                none: {
                                    scheduledAt: { gte: subMonths(now, 3) },
                                    isDeleted: false,
                                    status: { notIn: ['CANCELLED'] }
                                }
                            }
                        }
                    }
                },
                select: { name: true, phone: true, email: true },
                take: 10,
            }),
            prisma.job.findMany({
                where: {
                    isDeleted: false,
                    scheduledAt: { gte: now, lte: addDays(now, 14) },
                    status: { notIn: ['CANCELLED', 'COMPLETED'] },
                    technicians: { none: {} },
                    ...divFilter,
                },
                select: { description: true, scheduledAt: true },
                orderBy: { scheduledAt: 'asc' },
                take: 10,
            }),
            prisma.recurringService.findMany({
                where: { isActive: true, nextServiceDate: { gte: now, lte: addDays(now, 30) } },
                include: {
                    property: { include: { client: { select: { name: true, phone: true } } } },
                },
                take: 10,
            }),
            prisma.invoice.groupBy({
                by: ['clientId'],
                where: { isDeleted: false, status: 'PAID' },
                _sum: { total: true },
                orderBy: { _sum: { total: 'desc' } },
                take: 5,
            }),
            prisma.job.findMany({
                where: {
                    isDeleted: false,
                    scheduledAt: { gte: subDays(now, 7) },
                    ...divFilter,
                },
                include: {
                    technicians: { select: { name: true } },
                    property: { include: { client: { select: { name: true } } } },
                },
                orderBy: { scheduledAt: 'desc' },
                take: 15,
            }),
            prisma.user.findMany({
                where: { role: 'TECHNICIAN', isActive: true },
                select: {
                    name: true,
                    _count: { select: { jobs: { where: { scheduledAt: { gte: subDays(now, 7) } } } } }
                },
            }),
        ]);

        // Resolve top client names
        const clientIds = topClients.map(c => c.clientId);
        const topClientNames = await prisma.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, name: true },
        });
        const topClientsWithNames = topClients.map(tc => {
            const c = topClientNames.find(n => n.id === tc.clientId);
            return { name: c?.name || 'Inconnu', total: Number(tc._sum.total || 0) };
        });

        // Build context
        const context = `
DONNÉES EN TEMPS RÉEL — Praxis ZLS (${now.toLocaleDateString('fr-CA')}):

FACTURES NON PAYÉES:
- Total non payé: $${Number(unpaidTotal._sum.total || 0).toFixed(2)}
- Détail des impayés (top 10):
${overdueInvoices.map(i => `  • ${i.client?.name || 'Client inconnu'} — $${Number(i.total).toFixed(2)} — Statut: ${i.status} — Tél: ${(i.client as any)?.phone || 'N/A'}`).join('\n')}

CLIENTS SANS VISITE (+3 mois):
${clientsNoJob.length === 0 ? '  Aucun client à risque.' : clientsNoJob.map(c => `  • ${c.name} — ${c.phone || c.email || 'Pas de contact'}`).join('\n')}

JOBS SANS TECHNICIEN (14 prochains jours):
${unassignedJobs.length === 0 ? '  Aucun.' : unassignedJobs.map(j => `  • ${j.description || 'Sans titre'} — ${new Date(j.scheduledAt).toLocaleDateString('fr-CA')}`).join('\n')}

SERVICES RÉCURRENTS DUS (30 prochains jours):
${recurringDue.length === 0 ? '  Aucun.' : recurringDue.map(r => `  • ${(r.property as any)?.client?.name || 'Client'} — ${new Date(r.nextServiceDate!).toLocaleDateString('fr-CA')} — Tél: ${(r.property as any)?.client?.phone || 'N/A'}`).join('\n')}

CLIENTS LES PLUS RENTABLES:
${topClientsWithNames.map((c, i) => `  ${i + 1}. ${c.name} — $${c.total.toFixed(2)}`).join('\n')}

JOBS RÉCENTS (7 derniers jours):
${recentJobs.map(j => `  • ${(j.property as any)?.client?.name || 'Client'} — ${j.description || 'Service'} — Technicien(s): ${(j as any).technicians?.map((t: any) => t.name).join(', ') || 'Non assigné'} — ${new Date(j.scheduledAt).toLocaleDateString('fr-CA')}`).join('\n')}

TECHNICIENS (activité 7 derniers jours):
${technicianStats.map(t => `  • ${t.name}: ${(t as any)._count?.jobs || 0} job(s)`).join('\n')}
`.trim();

        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            system: `Tu es JARVIS, l'assistant IA de Praxis ZLS. Tu réponds en français québécois, de façon directe, précise et actionnable.
Tu as accès aux données en temps réel de la base de données. Réponds uniquement à ce qui est demandé. Sois concis mais complet.
Si tu listes des clients, inclus leur numéro de téléphone quand disponible.
Format: texte court, listes à puces si nécessaire. Pas de markdown complexe.`,
            prompt: `Données actuelles:\n${context}\n\nQuestion: ${question}`,
        });

        return { answer: text };
    } catch (error: any) {
        console.error('[Jarvis Chat Error]', error);
        return {
            answer: '',
            error: `Erreur JARVIS: ${error?.message || 'Impossible de contacter l\'IA'}`,
        };
    }
}
