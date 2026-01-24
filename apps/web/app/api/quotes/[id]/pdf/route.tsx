import { prisma } from '@/lib/prisma';
import { renderToStream } from '@react-pdf/renderer';
import { QuotePDF } from '@/components/pdf/quote-pdf';
import { NextResponse } from 'next/server';
import path from 'path';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    const quote = await prisma.quote.findUnique({
        where: { id },
        include: {
            client: true,
            items: {
                include: { product: true }
            }
        }
    });

    if (!quote) {
        return new NextResponse('Quote not found', { status: 404 });
    }

    const logoFilename = quote.division === "RENOVATION" ? "renovation-logo.png" : "zls-logo.png";
    const logoPath = path.join(process.cwd(), 'public', logoFilename);

    // Read file to buffer to ensure react-pdf can render it
    let logoData: Buffer | null = null;
    try {
        const fs = require('fs');
        logoData = fs.readFileSync(logoPath);
    } catch (e) {
        console.error("Error reading logo file:", e);
    }

    const stream = await renderToStream(
        <QuotePDF
            quote={quote}
            language={(quote.client as any).language || "FR"}
            logoPath={logoData ? `data:image/png;base64,${logoData.toString('base64')}` : undefined}
        />
    );

    return new NextResponse(stream as unknown as BodyInit, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Quote-${quote.number || quote.id.slice(0, 8)}.pdf"`,
        },
    });
}
