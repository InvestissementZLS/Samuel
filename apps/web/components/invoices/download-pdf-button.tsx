"use client";

import { Invoice, Client, Product, InvoiceItem } from "@prisma/client";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/pdf/invoice-pdf";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

interface DownloadPdfButtonProps {
    invoice: Invoice & {
        client: Client;
        items: (InvoiceItem & { product: Product })[];
    };
}

export function DownloadPdfButton({ invoice }: DownloadPdfButtonProps) {
    const [isClient, ZFisClient] = useState(false);

    useEffect(() => {
        ZFisClient(true);
    }, []);

    if (!isClient) return <Button variant="ghost" size="icon" disabled><FileText className="h-4 w-4" /></Button>;

    return (
        <PDFDownloadLink
            document={<InvoicePDF invoice={invoice} language={(invoice.client as any).language || "FR"} />}
            fileName={`Invoice-${invoice.number || invoice.id.slice(0, 8)}.pdf`}
        >
            {/* @ts-ignore */}
            {({ blob, url, loading, error }) => (
                <Button variant="ghost" size="icon" disabled={loading}>
                    <FileText className="h-4 w-4" />
                </Button>
            )}
        </PDFDownloadLink>
    );
}
