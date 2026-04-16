'use server';

import { prisma } from '@/lib/prisma';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, addDays } from 'date-fns';

export type InsightCategory = 'REVENU' | 'CLIENT' | 'CALENDRIER' | 'WORKFLOW' | 'TECHNICIEN' | 'RÉCURRENT';
export type InsightPriority = 'CRITIQUE' | 'IMPORTANT' | 'INFO';

export interface AIInsight {
    id: string;
    category: InsightCategory;
    priority: InsightPriority;
    title: string;
    description: string;
    action: string; // What to do about it
    actionUrl?: string; // Where to go
    metric?: string; // A key metric to display
}

export interface PlatformSnapshot {
    insights: AIInsight[];
    summary: string;
    healthScore: number; // 0-100
    generatedAt: string;
}

export async function generatePlatformInsights(division?: string): Promise<PlatformSnapshot> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const next7Days = addDays(now, 7);

    const divisionFilter = division ? { divisions: { has: division as any } } : {};
    const jobDivisionFilter = division ? { division: division as any } : {};

    // ── Collect Platform Metrics ──────────────────────────────────
    const [
        totalClients,
        newClientsThisMonth,
        clientsNoJobIn3Months,
        jobsThisMonth,
        jobsLastMonth,
        jobsThisWeek,
        jobsNoTechnicianNext7Days,
        overdueInvoices,
        unpaidInvoicesTotal,
        recurringDueIn30Days,
        technicianCount,
        jobStatusBreakdown,
        topJobDescriptions,
    ] = await Promise.all([
        // Total active clients
        prisma.client.count({ where: { isDeleted: false, ...divisionFilter } }),

        // New clients this month
        prisma.client.count({
            where: { isDeleted: false, createdAt: { gte: monthStart, lte: monthEnd }, ...divisionFilter }
        }),

        // Clients at risk (no job in 3 months)
        prisma.client.count({
            where: {
                isDeleted: false,
                ...divisionFilter,
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
            }
        }),

        // Jobs this month
        prisma.job.count({
            where: { isDeleted: false, scheduledAt: { gte: monthStart, lte: monthEnd }, ...jobDivisionFilter }
        }),

        // Jobs last month (for comparison)
        prisma.job.count({
            where: { isDeleted: false, scheduledAt: { gte: lastMonthStart, lte: lastMonthEnd }, ...jobDivisionFilter }
        }),

        // Jobs this week
        prisma.job.count({
            where: { isDeleted: false, scheduledAt: { gte: weekStart, lte: weekEnd }, ...jobDivisionFilter }
        }),

        // Jobs in next 7 days with NO technician assigned
        prisma.job.count({
            where: {
                isDeleted: false,
                scheduledAt: { gte: now, lte: next7Days },
                status: { notIn: ['CANCELLED', 'COMPLETED'] },
                technicians: { none: {} },
                ...jobDivisionFilter
            }
        }),

        // Overdue invoices count
        prisma.invoice.count({
            where: { isDeleted: false, status: 'OVERDUE' }
        }),

        // Total unpaid invoices value
        prisma.invoice.aggregate({
            where: { isDeleted: false, status: { in: ['SENT', 'OVERDUE'] } },
            _sum: { total: true }
        }),

        // Recurring services due in next 30 days
        prisma.recurringService.count({
            where: {
                isActive: true,
                nextServiceDate: { gte: now, lte: addDays(now, 30) }
            }
        }),

        // Active technicians
        prisma.user.count({ where: { role: 'TECHNICIAN', isActive: true } }),

        // Job status breakdown
        prisma.job.groupBy({
            by: ['status'],
            where: { isDeleted: false, scheduledAt: { gte: monthStart }, ...jobDivisionFilter },
            _count: true
        }),

        // Most common job types (descriptions)
        prisma.job.groupBy({
            by: ['description'],
            where: {
                isDeleted: false,
                scheduledAt: { gte: subMonths(now, 2) },
                description: { not: null },
                ...jobDivisionFilter
            },
            _count: true,
            orderBy: { _count: { description: 'desc' } },
            take: 5
        }),
    ]);

    const jobGrowth = jobsLastMonth > 0
        ? Math.round(((jobsThisMonth - jobsLastMonth) / jobsLastMonth) * 100)
        : 0;

    const unpaidAmount = unpaidInvoicesTotal._sum.total || 0;
    const completedJobs = jobStatusBreakdown.find(j => j.status === 'COMPLETED')?._count || 0;
    const cancelledJobs = jobStatusBreakdown.find(j => j.status === 'CANCELLED')?._count || 0;

    // ── Build Context for GPT-4o ─────────────────────────────────
    const metricsContext = `
TABLEAU DE BORD PRAXIS ZLS — Rapport de santé automatisé:
Division analysée: ${division || 'Toutes'}

CLIENTS:
- Total clients actifs: ${totalClients}
- Nouveaux clients ce mois-ci: ${newClientsThisMonth}
- Clients sans visite depuis 3+ mois: ${clientsNoJobIn3Months} (risque de perte)

CALENDRIER & JOBS:
- Jobs ce mois-ci: ${jobsThisMonth} (${jobGrowth >= 0 ? '+' : ''}${jobGrowth}% vs mois passé)
- Jobs cette semaine: ${jobsThisWeek}
- Jobs des 7 prochains jours SANS technicien assigné: ${jobsNoTechnicianNext7Days} ⚠️
- Jobs complétés ce mois: ${completedJobs}
- Jobs annulés ce mois: ${cancelledJobs}

FINANCES:
- Factures en souffrance (OVERDUE): ${overdueInvoices}
- Montant total non-payé: $${Number(unpaidAmount).toFixed(2)}

SERVICES RÉCURRENTS:
- Services récurrents dus dans les 30 prochains jours: ${recurringDueIn30Days}

ÉQUIPE:
- Techniciens actifs: ${technicianCount}
- Ratio jobs/technicien cette semaine: ${technicianCount > 0 ? (jobsThisWeek / technicianCount).toFixed(1) : 'N/A'}

SERVICES LES PLUS DEMANDÉS (2 derniers mois):
${topJobDescriptions.map(j => `- "${j.description}": ${j._count} fois`).join('\n')}
`.trim();

    // ── Gemini 1.5 Flash Analysis ────────────────────────────────
    const { object } = await generateObject({
        model: google('gemini-1.5-flash'),
        system: `Tu es le Co-Pilote IA de Praxis ZLS, expert en gestion d'entreprises d'entretien et d'extermination au Québec.
Tu analyse les métriques de la plateforme et tu fournis des recommandations précises, actionnables, et priorisées.
Chaque recommandation doit être en français, courte, directe, et spécifique au contexte québécois.
Ne génère que des insights qui ont une valeur réelle — pas de conseil générique.`,
        prompt: `Voici les métriques actuelles de la plateforme:\n\n${metricsContext}\n\nGénère entre 4 et 7 insights pertinents.`,
        schema: z.object({
            insights: z.array(z.object({
                id: z.string().describe("ID unique court (ex: 'no-tech-jobs', 'client-retention')"),
                category: z.enum(['REVENU', 'CLIENT', 'CALENDRIER', 'WORKFLOW', 'TECHNICIEN', 'RÉCURRENT']),
                priority: z.enum(['CRITIQUE', 'IMPORTANT', 'INFO']),
                title: z.string().describe("Titre court et percutant (max 8 mots)"),
                description: z.string().describe("Explication du problème ou opportunité (max 2 phrases)"),
                action: z.string().describe("Action concrète recommandée (max 1 phrase impérative)"),
                actionUrl: z.string().describe("URL interne si applicable (ex: '/calendar', '/clients', '/recurring'). Vide si aucune."),
                metric: z.string().describe("Chiffre clé à mettre en avant (ex: '5 jobs non assignés'). Vide si aucun."),
            })),
            summary: z.string().describe("Résumé exécutif de l'état de la plateforme en 2 phrases."),
            healthScore: z.number().min(0).max(100).describe("Score de santé global de 0 à 100 basé sur les métriques."),
        })
    });

    return {
        ...object,
        generatedAt: now.toISOString(),
    };
}
