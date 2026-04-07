import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAuth } from '@/lib/auth';
import { ClientSearchResponseSchema, QuickCreateClientSchema } from '@/lib/schemas/mobile-api';

/**
 * GET /api/clients?search=Dupont&limit=20
 * Recherche live de clients — utilisé par l'app mobile
 */
export async function GET(request: NextRequest) {
    const currentUser = await validateAuth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() ?? '';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);

    try {
        const clients = await prisma.client.findMany({
            where: {
                isDeleted: false,
                ...(search.length > 0 ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { phone: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                    ],
                } : {}),
            },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                billingAddress: true,
                properties: {
                    where: { isDeleted: false },
                    select: { id: true, address: true },
                    take: 5,
                },
            },
            orderBy: { name: 'asc' },
            take: limit,
        });

        const safe = ClientSearchResponseSchema.parse(clients);
        return NextResponse.json(safe);

    } catch (error) {
        console.error('[GET /api/clients] error:', error);
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
    }
}

/**
 * POST /api/clients
 * Création rapide de client depuis l'app mobile (lors d'un appel entrant)
 * Body: { name, phone?, address? }
 */
export async function POST(request: NextRequest) {
    const currentUser = await validateAuth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const parsed = QuickCreateClientSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Données invalides', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { name, phone, address } = parsed.data;

        // Créer le client + une propriété par défaut si adresse fournie
        const client = await prisma.client.create({
            data: {
                name,
                phone: phone ?? null,
                ...(address ? {
                    properties: {
                        create: {
                            address,
                        },
                    },
                } : {}),
            },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                billingAddress: true,
                properties: {
                    select: { id: true, address: true },
                },
            },
        });

        return NextResponse.json({
            client,
            property: client.properties[0] ?? null,
        }, { status: 201 });

    } catch (error) {
        console.error('[POST /api/clients] error:', error);
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
    }
}
