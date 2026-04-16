'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ============================================================
// SCHEMA - Complete AI intelligence extraction schema
// ============================================================
const AiCommandSchema = z.object({
    intent: z.enum([
        'CREATE_CLIENT_ONLY',
        'CREATE_CLIENT_AND_JOB',
        'SCHEDULE_JOB_EXISTING',
        'SEND_BOOKING_LINK',
        'UNKNOWN',
    ]).describe("L'intention principale de la commande."),

    client: z.object({
        searchName: z.string().describe("Nom ou partiel du client existant à rechercher. Ex: 'Tremblay'. Vide si nouveau client."),
        name: z.string().describe("Prénom et/ou nom complet ou d'entreprise. Vide si client existant suffit."),
        companyName: z.string().describe("Nom de l'entreprise si applicable. Vide sinon."),
        phone: z.string().describe("Numéro de téléphone au format 514-555-5555. Vide si absent."),
        email: z.string().describe("Adresse courriel. Vide si absente."),
        billingAddress: z.string().describe("Adresse complète. Vide si absente."),
        language: z.enum(["FR", "EN"]).describe("Langue détectée. FR par défaut."),
    }),

    job: z.object({
        needsJob: z.boolean().describe("Vrai si la commande implique un rendez-vous ou travail."),
        description: z.string().describe("Description courte du service. Ex: 'Inspection fourmis charpentières'. Vide si non applicable."),
        scheduledDateHint: z.string().describe("Date souhaitée en français. Ex: 'demain', 'lundi prochain', '22 avril'. Vide si non mentionné."),
        scheduledTimeHint: z.string().describe("Heure souhaitée. Ex: '14h00', '8h30', 'matin', 'après-midi'. Vide si non mentionné."),
        period: z.enum(["AM", "PM", "ANY"]).describe("Période de la journée préférée."),
        serviceKeyword: z.string().describe("Mot-clé du service. Ex: 'souris', 'fourmis', 'coquerelles', 'inspection'. Vide si non applicable."),
    }),
});

// ============================================================
// parseCallNotes - Main multimodal AI extraction function
// ============================================================
export async function parseCallNotes(text: string, imageBase64?: string) {
    if (!text && !imageBase64) {
        return { success: false as const, error: "Aucun texte ni image fourni." };
    }

    if (!process.env.OPENAI_API_KEY) {
        return { success: false as const, error: "Clé OpenAI non configurée. Contactez l'administrateur." };
    }

    try {
        const content: any[] = [];
        
        if (text) {
            content.push({ 
                type: 'text', 
                text: `Commande/Notes reçues:\n"${text}"\n\nExtrayez les informations selon le schéma JSON.` 
            });
        }
        
        // Fix: FileReader.readAsDataURL() returns "data:image/jpeg;base64,XXXX"
        if (imageBase64) {
            const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
            if (dataUrlMatch) {
                const mimeType = dataUrlMatch[1] as any;
                const rawBase64 = dataUrlMatch[2];
                content.push({ type: 'image', image: rawBase64, mimeType });
            } else {
                content.push({ type: 'image', image: imageBase64 });
            }
        }

        const { object } = await generateObject({
            model: google('gemini-1.5-flash'),
            system: `Tu es le cerveau de Praxis ZLS, une plateforme de gestion pour exterminateurs et gestionnaires immobiliers/industriels au Québec.
Tu reçois des commandes en français québécois (texte brut, vocal, ou captures d'écran) et tu dois en extraire la structure complète.

RÈGLES CRITIQUES:
1. Si l’utilisateur parle d’un client EXISTANT (ex: "Tremblay", "Manolo", "La Boulangerie du coin"), mets ce nom dans "searchName".
2. Si c’est un NOUVEAU client, mets les infos dans les champs "name", "phone", etc. et laisse "searchName" vide.
3. Pour les dates: "demain" = demain, "lundi" = prochain lundi. Retourne la date lisible en français.
4. Pour les heures: "PM" = après-midi, "matin" ou "AM" = avant-midi. Si l’heure exacte est dite, mets-la (ex: "14h00").
5. Formate les numéros de téléphone au format 514-555-5555.
6. Ne retourne jamais null, utilise "" pour les champs manquants.`,
            messages: [{ role: 'user', content }],
            schema: AiCommandSchema,
        });

        return { success: true as const, data: object };
    } catch (error: any) {
        console.error("AI Parsing Error:", error?.message || error);
        return { success: false as const, error: `L’IA n’a pas pu analyser: ${error?.message || 'Erreur inconnue'}` };
    }
}

// ============================================================
// searchExistingClients - Search clients in DB from AI hint
// ============================================================
export async function searchExistingClients(searchName: string, division?: string, phone?: string, email?: string) {
    const orConditions: any[] = [];
    const divisionFilter = division ? [{ divisions: { has: division as any } }] : [];

    // Search by name keywords
    if (searchName && searchName.trim().length >= 2) {
        const terms = searchName.trim().split(/\s+/);
        terms.forEach(term => {
            orConditions.push({ name: { contains: term, mode: 'insensitive' as const } });
            orConditions.push({ companyName: { contains: term, mode: 'insensitive' as const } });
        });
    }

    // Direct phone match (strips non-digits for flexible matching)
    if (phone && phone.trim().length >= 7) {
        const digits = phone.replace(/\D/g, '');
        if (digits.length >= 7) {
            orConditions.push({ phone: { contains: digits.slice(-7) } }); // Last 7 digits
            orConditions.push({ phone: { contains: phone.trim() } });      // Raw format
        }
    }

    // Direct email match
    if (email && email.includes('@')) {
        orConditions.push({ email: { equals: email.trim(), mode: 'insensitive' as const } });
    }

    if (orConditions.length === 0) return [];

    const clients = await prisma.client.findMany({
        where: {
            isDeleted: false,
            AND: [
                ...divisionFilter,
                { OR: orConditions }
            ]
        },
        include: {
            properties: {
                where: { isDeleted: false },
                select: { id: true, address: true, type: true }
            }
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
    });

    return clients;
}

// ============================================================
// createJobFromAI - Create a calendar job from AI data
// ============================================================
export async function createJobFromAI(data: {
    clientId: string;
    propertyId: string;
    description: string;
    scheduledAt: Date;
    division: 'EXTERMINATION' | 'ENTREPRISES' | 'RENOVATION';
}) {
    const job = await prisma.job.create({
        data: {
            propertyId: data.propertyId,
            description: data.description,
            scheduledAt: data.scheduledAt,
            status: 'SCHEDULED',
            division: data.division,
        },
        include: {
            property: {
                include: { client: { select: { name: true } } }
            }
        }
    });

    revalidatePath('/calendar');
    revalidatePath('/clients');
    return job;
}


