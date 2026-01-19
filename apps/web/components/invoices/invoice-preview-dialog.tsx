"use client";

import { Modal } from "@/components/ui/modal";
import { InvoicePDF } from "@/components/pdf/invoice-pdf";
import { PDFViewer } from "@react-pdf/renderer";
import { Invoice, Product, Client } from "@prisma/client";

interface InvoicePreviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice & {
        client: Client;
        items: (any & { product: Product })[];
    };
    language?: "EN" | "FR";
}

export function InvoicePreviewDialog({ isOpen, onClose, invoice, language = "FR" }: InvoicePreviewDialogProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Invoice Preview"
            maxWidth="max-w-4xl"
        >
            <div className="h-[80vh] w-full">
                <PDFViewer width="100%" height="100%" className="rounded-md">
                    <InvoicePDF invoice={invoice} language={language} />
                </PDFViewer>
            </div>
        </Modal>
    );
}
