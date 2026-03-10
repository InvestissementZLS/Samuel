'use server';

import { prisma } from '@/lib/prisma';
import { Division } from '@prisma/client';

export interface RenewalOpportunity {
    client: any;
    lastService: string;
    lastDate: Date;
    estimatedValue: number;
}

export async function getRenewalOpportunities(division: Division = 'EXTERMINATION'): Promise<RenewalOpportunity[]> {
    // Dans un cas réel, on ciblerait les factures/jobs d'il y a 10 à 12 mois
    // Comme nous venons d'importer toutes les factures aujourd'hui, 
    // l'algorithme suivant va chercher les factures qui ont la mention "Bi-Monthly" 
    // ou "Monthly" de l'ancien système pour détecter instantanément les opportunités.

    // Si nous avions les vraies "createdAt" historiques on ferait :
    // const elevenMonthsAgo = new Date(); elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);

    const historicalInvoices = await prisma.invoice.findMany({
        where: {
            division,
            // Pour la démonstration immédiate, on cherche les visites récurrentes
            // ou les notes GorillaDesk contenant "Monthly" ou "Yearly"
            OR: [
                { description: { contains: 'Monthly', mode: 'insensitive' } },
                { description: { contains: 'Annual', mode: 'insensitive' } },
                { description: { contains: 'Preventive', mode: 'insensitive' } },
                { notes: { contains: 'Monthly', mode: 'insensitive' } }
            ]
        },
        include: {
            client: true
        },
        take: 15 // Limiter pour le widget du dashboard
    });

    // Dédoublonner par client
    const uniqueClients = new Map<string, RenewalOpportunity>();

    for (const inv of historicalInvoices) {
        if (!uniqueClients.has(inv.clientId)) {
            uniqueClients.set(inv.clientId, {
                client: inv.client,
                lastService: inv.description || 'Service Extermination',
                lastDate: inv.createdAt,
                estimatedValue: inv.total || 0
            });
        }
    }

    return Array.from(uniqueClients.values());
}
