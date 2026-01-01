import { prisma } from '@/lib/prisma';
import { renderToBuffer, Document, Page, Text, View } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/pdf/invoice-pdf';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    console.log("PDF Generation Triggered");
    const { id } = params;
    console.log("Fetching invoice for PDF:", id);

    try {
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
            console.error("Invoice not found:", id);
            return new NextResponse('Invoice not found', { status: 404 });
        }

        console.log("Invoice found, testing minimal PDF render...");

        // MINIMAL TEST RENDER
        /*
        const buffer = await renderToBuffer(
            <InvoicePDF
                invoice={invoice}
                language={(invoice.client as any).language || "FR"}
            />
        );
        */
        const buffer = await renderToBuffer(
            <Document>
                <Page size="A4">
                    <View>
                        <Text>Hello World Test</Text>
                    </View>
                </Page>
            </Document>
        );

        console.log("PDF rendered successfully, size:", buffer.length);

        return new NextResponse(buffer as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Invoice-${invoice.number || invoice.id.slice(0, 8)}.pdf"`,
            },
        });
    } catch (error) {
        console.error("Error generating PDF:", error);
        return new NextResponse('Error generating PDF', { status: 500 });
    }
}
