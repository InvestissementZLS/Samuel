import { prisma } from '@/lib/prisma';
import { renderToStream } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/pdf/invoice-pdf';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
            client: true,
            items: {
                include: { product: true }
            }
        }
    });

    if (!invoice) {
        return new NextResponse('Invoice not found', { status: 404 });
    }

    const stream = await renderToStream(
        <InvoicePDF
            invoice={invoice}
            language={(invoice.client as any).language || "FR"}
        />
    );

    return new NextResponse(stream as unknown as BodyInit, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Invoice-${invoice.number || invoice.id.slice(0, 8)}.pdf"`,
        },
    });
}
