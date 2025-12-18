import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { Invoice, Product, Client, Property } from '@prisma/client';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

// Register fonts if needed, or use standard ones
// Font.register({ family: 'Roboto', src: '...' });

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    companyInfo: {
        fontSize: 10,
        color: '#555',
    },
    clientInfo: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderRadius: 4,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    text: {
        fontSize: 10,
        marginBottom: 3,
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        marginTop: 20,
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row',
    },
    tableCol: {
        width: '25%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    tableColDesc: {
        width: '50%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    tableCell: {
        margin: 'auto',
        marginTop: 5,
        marginBottom: 5,
        fontSize: 10,
    },
    tableHeader: {
        backgroundColor: '#f3f4f6',
        fontWeight: 'bold',
    },
    totals: {
        marginTop: 20,
        alignItems: 'flex-end',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 200,
        marginBottom: 5,
    },
    totalLabel: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    totalValue: {
        fontSize: 10,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 8,
        color: '#999',
    },
});

interface InvoicePDFProps {
    invoice: Invoice & {
        client: Client;
        items: (any & { product: Product })[];
    };
    language?: "EN" | "FR";
}

const t = {
    EN: {
        invoice: "INVOICE",
        billTo: "Bill To",
        date: "Date",
        dueDate: "Due Date",
        item: "Item",
        description: "Description",
        quantity: "Qty",
        price: "Price",
        total: "Total",
        subtotal: "Subtotal",
        tax: "Tax",
        grandTotal: "Grand Total",
        thankYou: "Thank you for your business!",
    },
    FR: {
        invoice: "FACTURE",
        billTo: "Facturé à",
        date: "Date",
        dueDate: "Échéance",
        item: "Article",
        description: "Description",
        quantity: "Qté",
        price: "Prix",
        total: "Total",
        subtotal: "Sous-total",
        tax: "Taxes",
        grandTotal: "Grand Total",
        thankYou: "Merci de votre confiance !",
    }
};

export const InvoicePDF = ({ invoice, language = "FR" }: InvoicePDFProps) => {
    const labels = t[language] || t.FR;
    const dateLocale = language === "FR" ? fr : enUS;

    const safeFormatDate = (date: Date | string | null | undefined) => {
        if (!date) return '-';
        try {
            return format(new Date(date), 'PPP', { locale: dateLocale });
        } catch (e) {
            return '-';
        }
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>{labels.invoice}</Text>
                        <Text style={styles.text}>#{String(invoice.number || invoice.id.slice(0, 8))}</Text>
                    </View>
                    <View style={styles.companyInfo}>
                        <Text style={{ fontWeight: 'bold', fontSize: 12 }}>
                            {invoice.division === "EXTERMINATION" ? "Extermination ZLS" : "Les Entreprises ZLS"}
                        </Text>
                        <Text>123 Business St.</Text>
                        <Text>City, State, Zip</Text>
                        <Text>Phone: (555) 123-4567</Text>
                        <Text>Email: info@zls.com</Text>
                    </View>
                </View>

                {/* Client Info */}
                <View style={styles.clientInfo}>
                    <Text style={styles.sectionTitle}>{labels.billTo}:</Text>
                    <Text style={styles.text}>{String(invoice.client.name || '')}</Text>
                    <Text style={styles.text}>{String(invoice.client.billingAddress || invoice.client.email || "")}</Text>
                    <Text style={styles.text}>{String(invoice.client.phone || "")}</Text>
                </View>

                {/* Dates */}
                <View style={{ flexDirection: 'row', marginTop: 20, gap: 50 }}>
                    <View>
                        <Text style={styles.sectionTitle}>{labels.date}:</Text>
                        <Text style={styles.text}>{safeFormatDate(invoice.issuedDate)}</Text>
                    </View>
                    <View>
                        <Text style={styles.sectionTitle}>{labels.dueDate}:</Text>
                        <Text style={styles.text}>{safeFormatDate(invoice.dueDate)}</Text>
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <View style={styles.tableColDesc}>
                            <Text style={styles.tableCell}>{labels.description}</Text>
                        </View>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCell}>{labels.quantity}</Text>
                        </View>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCell}>{labels.price}</Text>
                        </View>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCell}>{labels.total}</Text>
                        </View>
                    </View>
                    {invoice.items.map((item, index) => (
                        <View style={styles.tableRow} key={index}>
                            <View style={styles.tableColDesc}>
                                <Text style={styles.tableCell}>
                                    {`${item.product.name}${item.description ? ` - ${item.description}` : ''}`}
                                </Text>
                            </View>
                            <View style={styles.tableCol}>
                                <Text style={styles.tableCell}>{String(item.quantity)}</Text>
                            </View>
                            <View style={styles.tableCol}>
                                <Text style={styles.tableCell}>${Number(item.price).toFixed(2)}</Text>
                            </View>
                            <View style={styles.tableCol}>
                                <Text style={styles.tableCell}>${(Number(item.quantity) * Number(item.price)).toFixed(2)}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totals}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{labels.subtotal}:</Text>
                        <Text style={styles.totalValue}>${Number(invoice.total - (invoice.tax || 0)).toFixed(2)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{labels.tax}:</Text>
                        <Text style={styles.totalValue}>${Number(invoice.tax || 0).toFixed(2)}</Text>
                    </View>
                    <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 5 }]}>
                        <Text style={[styles.totalLabel, { fontSize: 12 }]}>{labels.grandTotal}:</Text>
                        <Text style={[styles.totalValue, { fontSize: 12, fontWeight: 'bold' }]}>${Number(invoice.total).toFixed(2)}</Text>
                    </View>

                    {/* Amount Paid & Balance - Commented out for debugging base render */}
                    {/* 
                    {(invoice.amountPaid && Number(invoice.amountPaid) > 0) ? (
                        <View>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>{language === 'FR' ? "Payé" : "Amount Paid"}:</Text>
                                <Text style={[styles.totalValue, { color: 'green' }]}>-${Number(invoice.amountPaid).toFixed(2)}</Text>
                            </View>
                            <View style={[styles.totalRow, { marginTop: 5 }]}>
                                <Text style={[styles.totalLabel, { fontSize: 12 }]}>{language === 'FR' ? "Solde Dû" : "Balance Due"}:</Text>
                                <Text style={[styles.totalValue, { fontSize: 12, fontWeight: 'bold' }]}>${Math.max(0, invoice.total - Number(invoice.amountPaid)).toFixed(2)}</Text>
                            </View>
                        </View>
                    ) : null}
                    */}
                </View>

                {/* Footer */}
                <Text style={styles.footer}>{labels.thankYou}</Text>
            </Page>
        </Document>
    );
};
