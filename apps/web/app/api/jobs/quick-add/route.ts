import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAuth } from '@/lib/auth';
import { QuickAddJobSchema, QuickAddJobResponseSchema } from '@/lib/schemas/mobile-api';

/**
 * POST /api/jobs/quick-add
 * Ajoute rapidement un job à la route du jour depuis l'app mobile.
 * Utilisé quand un technicien reçoit un appel entrant et veut l'ajouter à sa journée.
 *
 * Body: { technicianId, clientId, propertyId, scheduledAt, description? }
 */
export async function POST(request: NextRequest) {
    const currentUser = await validateAuth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const parsed = QuickAddJobSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Données invalides', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { technicianId, clientId, propertyId, scheduledAt, description } = parsed.data;

        // Vérifier que la propriété appartient bien au client
        const property = await prisma.property.findFirst({
            where: {
                id: propertyId,
                clientId,
                isDeleted: false,
            },
        });

        if (!property) {
            return NextResponse.json(
                { error: 'Propriété introuvable pour ce client' },
                { status: 404 }
            );
        }

        // Créer le job et assigner le technicien
        const job = await prisma.job.create({
            data: {
                propertyId,
                scheduledAt: new Date(scheduledAt),
                status: 'SCHEDULED',
                description: description ?? null,
                technicians: {
                    connect: { id: technicianId },
                },
            },
            select: {
                id: true,
                scheduledAt: true,
                status: true,
                description: true,
                property: {
                    select: {
                        address: true,
                        client: {
                            select: {
                                name: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
        });

        // Valider la réponse avec le schéma partagé
        const safeResponse = QuickAddJobResponseSchema.parse({
            job: {
                ...job,
                scheduledAt: job.scheduledAt.toISOString(),
            },
        });

        return NextResponse.json(safeResponse, { status: 201 });

    } catch (error) {
        console.error('[POST /api/jobs/quick-add] error:', error);
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
    }
}
