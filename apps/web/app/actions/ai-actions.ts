'use server';

import { generateObject } from 'ai';
import { openai as aiSdkOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import OpenAI from 'openai';

// Official OpenAI client for Whisper API
const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function parseCallNotes(text: string, imageBase64?: string) {
    if (!text && !imageBase64) {
        throw new Error("Aucun texte ni image fourni.");
    }

    try {
        // Prepare content array (multimodal support)
        const messages: any[] = [];
        const content: any[] = [];
        
        if (text) {
            content.push({ type: 'text', text: `Texte ou notes reçus :\n"${text}"\n\nAnalysez ces notes et/ou l'image.` });
        }
        
        if (imageBase64) {
            content.push({
                type: 'image',
                image: imageBase64, // URL-friendly base64 encoding handled by @ai-sdk
            });
        }

        messages.push({ role: 'user', content });

        const { object } = await generateObject({
            model: aiSdkOpenAI('gpt-4o-mini'),
            system: `Tu es l'assistant IA de Praxis ZLS "Action Sur La Route", un logiciel de gestion pour des exterminateurs et gestionnaires immobiliers/industriels au Québec.
Ton but est d'extraire les informations pertinentes à la volée depuis des notes de téléphone brouillonnes, des mémos vocaux transcrits, ou des captures d'écran/photos de cartes d'affaires, courriels, et textos.
Tu dois absolument retourner un objet JSON propre. Si une information est introuvable, retourne la chaîne vide "" plutôt que null, à moins que ce soit optionnel.
Identifie également si un Rendez-Vous (Job) doit être créé avec les infos fournies.
Formate le numéro de téléphone au format nord-américain (ex: 514-555-5555) si possible.
Les noms de rue doivent être propres.`,
            messages: messages,
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

export async function transcribeAudio(formData: FormData) {
    try {
        const file = formData.get('audio') as File;
        if (!file) {
            throw new Error("Aucun fichier audio fourni");
        }

        const response = await openaiClient.audio.transcriptions.create({
            file,
            model: 'whisper-1',
            language: 'fr',
            prompt: 'Contexte: Gestionnaire immobilier/exterminateur québécois dictant des informations clients ou de prise de rendez-vous.',
        });

        return response.text;
    } catch (error: any) {
        console.error("Audio Transcription Error:", error);
        throw new Error("L'Intelligence Artificielle n'a pas pu transcrire l'audio.");
    }
}
