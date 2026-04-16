import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            return NextResponse.json(
                { error: 'Clé Google AI non configurée sur le serveur.' },
                { status: 500 }
            );
        }

        const formData = await request.formData();
        const audioFile = formData.get('audio') as File | null;

        if (!audioFile) {
            return NextResponse.json({ error: 'Aucun fichier audio reçu.' }, { status: 400 });
        }

        const arrayBuffer = await audioFile.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');

        // Use Gemini 2.5 Flash for transcription
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: 'audio/webm',
                    data: base64Audio,
                }
            },
            {
                text: `Transcris exactement ce qui est dit dans cet audio en français québécois. 
                Contexte: Un gestionnaire d'entreprise d'extermination ou d'entretien au Québec dicte des informations client ou de prise de rendez-vous.
                Retourne uniquement la transcription, sans explication ni formatage supplémentaire.`
            }
        ]);

        const text = result.response.text().trim();
        return NextResponse.json({ text });

    } catch (error: any) {
        console.error('[Transcribe API Error]', error);
        return NextResponse.json(
            { error: error.message || "Erreur de transcription audio." },
            { status: 500 }
        );
    }
}
