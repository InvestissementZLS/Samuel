import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Marked dynamic so Next.js never tries to statically analyze this route at build time
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'Clé OpenAI non configurée sur le serveur.' },
                { status: 500 }
            );
        }

        // Initialize client INSIDE the handler — never at module level —
        // so it's not evaluated during Next.js static build analysis
        const openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const formData = await request.formData();
        const audioFile = formData.get('audio') as File | null;

        if (!audioFile) {
            return NextResponse.json({ error: 'Aucun fichier audio reçu.' }, { status: 400 });
        }

        // Convert File to a format Whisper accepts
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const file = new File([buffer], 'recording.webm', { type: 'audio/webm' });

        const response = await openaiClient.audio.transcriptions.create({
            file,
            model: 'whisper-1',
            language: 'fr',
            prompt: 'Gestionnaire immobilier/exterminateur québécois dictant des informations client ou de prise de rendez-vous.',
        });

        return NextResponse.json({ text: response.text });
    } catch (error: any) {
        console.error('[Transcribe API Error]', error);
        return NextResponse.json(
            { error: error.message || "Erreur de transcription audio." },
            { status: 500 }
        );
    }
}
