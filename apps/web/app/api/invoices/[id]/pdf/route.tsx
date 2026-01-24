import { prisma } from '@/lib/prisma';
import { renderToStream } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/pdf/invoice-pdf';
import { NextResponse } from 'next/server';
import path from 'path';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

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

    const logoFilename = invoice.division === "RENOVATION" ? "renovation-logo.png" : "zls-logo.png";
    const logoPath = path.join(process.cwd(), 'public', logoFilename);

    const stream = await renderToStream(
        <InvoicePDF
            invoice={invoice}
            language={(invoice.client as any).language || "FR"}
            logoPath={logoPath}
        />
    );

    return new NextResponse(stream as unknown as BodyInit, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Invoice-${invoice.number || invoice.id.slice(0, 8)}.pdf"`,
        },
    });
}
