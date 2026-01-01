import { prisma } from '@/lib/prisma';
import { renderToStream } from '@react-pdf/renderer';
import { QuotePDF } from '@/components/pdf/quote-pdf';
import { NextResponse } from 'next/server';

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

    const stream = await renderToStream(
        <QuotePDF
            quote={quote}
            language={(quote.client as any).language || "FR"}
        />
    );

    return new NextResponse(stream as unknown as BodyInit, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Quote-${quote.number || quote.id.slice(0, 8)}.pdf"`,
        },
    });
}
