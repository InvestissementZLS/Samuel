'use server';

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export async function parseCallNotes(text: string) {
    if (!text || text.trim() === '') {
        throw new Error("Le texte fourni est vide.");
    }

    try {
        const { object } = await generateObject({
            model: openai('gpt-4o-mini'),
            system: `Tu es l'assistant IA de Praxis ZLS "Action Sur La Route", un logiciel de gestion pour des exterminateurs et gestionnaires immobiliers/industriels au Québec.
Ton but est d'extraire les informations pertinentes à la volée depuis des notes de téléphone brouillonnes, des mémos vocaux transcrits, ou des SMS.
Tu dois absolument retourner un objet JSON propre. Si une information est introuvable, retourne la chaîne vide "" plutôt que null, à moins que ce soit optionnel.
Identifie également si un Rendez-Vous (Job) doit être créé avec les infos fournies.
Formate le numéro de téléphone au format nord-américain (ex: 514-555-5555) si possible.
Les noms de rue doivent être propres.`,
            prompt: `Texte brut reçu :\n"${text}"\n\nS'il te plaît, analyse ce texte et extrais les informations pour créer un Client et potentiellement un Rendez-vous/Job.`,
            schema: z.object({
                client: z.object({
                    name: z.string().describe("Le prénom et/ou le nom de famille de la personne ou l'entreprise."),
                    companyName: z.string().optional().describe("Le nom de l'entreprise si applicable."),
                    phone: z.string().describe("Le numéro de téléphone (obligatoire, mettre vide si introuvable)."),
                    email: z.string().describe("L'adresse courriel (mettre vide si introuvable)."),
                    billingAddress: z.string().describe("L'adresse complète la plus précise possible (obligatoire, mettre vide si introuvable)."),
                    language: z.enum(["FR", "EN"]).describe("La langue détectée ou par défaut 'FR'."),
                }),
                job: z.object({
                    needsJob: z.boolean().describe("Vrai si le texte implique qu'un travail (job) ou une inspection est requis."),
                    description: z.string().describe("Résumé très court du problème (ex: Problème de fourmis charpentières depuis 1 mois). Mettre vide si non applicable."),
                    preferredTiming: z.string().describe("Si le client mentionne une disponibilité (ex: 'Lundi matin' ou 'Le plus vite possible'). Mettre vide sinon."),
                })
            })
        });

        return object;
    } catch (error: any) {
        console.error("AI Parsing Error:", error);
        throw new Error("L'Intelligence Artificielle n'a pas pu décrypter ce message. Vérifiez si la clé OpenAI est bien configurée ou si le message n'est pas trop vague.");
    }
}
