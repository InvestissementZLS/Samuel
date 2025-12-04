import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Quote, Product, Client } from '@prisma/client';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

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
        color: '#4F46E5', // Indigo
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

interface QuotePDFProps {
    quote: Quote & {
        client: Client;
        items: (any & { product: Product })[];
    };
    language?: "EN" | "FR";
}

const t = {
    EN: {
        quote: "QUOTE",
        billTo: "Prepared For",
        date: "Date",
        validUntil: "Valid Until",
        item: "Item",
        description: "Description",
        quantity: "Qty",
        price: "Price",
        total: "Total",
        subtotal: "Subtotal",
        tax: "Tax",
        grandTotal: "Grand Total",
        terms: "Terms & Conditions",
    },
    FR: {
        quote: "SOUMISSION",
        billTo: "Préparé pour",
        date: "Date",
        validUntil: "Valide jusqu'au",
        item: "Article",
        description: "Description",
        quantity: "Qté",
        price: "Prix",
        total: "Total",
        subtotal: "Sous-total",
        tax: "Taxes",
        grandTotal: "Grand Total",
        terms: "Termes et Conditions",
    }
};

export const QuotePDF = ({ quote, language = "FR" }: QuotePDFProps) => {
    const labels = t[language];
    const dateLocale = language === "FR" ? fr : enUS;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>{labels.quote}</Text>
                        <Text style={styles.text}>#{quote.number || quote.id.slice(0, 8)}</Text>
                    </View>
                    <View style={styles.companyInfo}>
                        <Text style={{ fontWeight: 'bold', fontSize: 12 }}>
                            {quote.division === "EXTERMINATION" ? "Extermination ZLS" : "Les Entreprises ZLS"}
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
                    <Text style={styles.text}>{quote.client.name}</Text>
                    <Text style={styles.text}>{quote.client.billingAddress || quote.client.email || ""}</Text>
                    <Text style={styles.text}>{quote.client.phone || ""}</Text>
                </View>

                {/* Dates */}
                <View style={{ flexDirection: 'row', marginTop: 20, gap: 50 }}>
                    <View>
                        <Text style={styles.sectionTitle}>{labels.date}:</Text>
                        <Text style={styles.text}>{format(new Date(quote.issuedDate), 'PPP', { locale: dateLocale })}</Text>
                    </View>
                    {quote.dueDate && (
                        <View>
                            <Text style={styles.sectionTitle}>{labels.validUntil}:</Text>
                            <Text style={styles.text}>
                                {format(new Date(quote.dueDate), 'PPP', { locale: dateLocale })}
                            </Text>
                        </View>
                    )}
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
                    {quote.items.map((item, index) => (
                        <View style={styles.tableRow} key={index}>
                            <View style={styles.tableColDesc}>
                                <Text style={styles.tableCell}>{item.product.name} {item.description ? `- ${item.description}` : ''}</Text>
                            </View>
                            <View style={styles.tableCol}>
                                <Text style={styles.tableCell}>{item.quantity}</Text>
                            </View>
                            <View style={styles.tableCol}>
                                <Text style={styles.tableCell}>${item.price.toFixed(2)}</Text>
                            </View>
                            <View style={styles.tableCol}>
                                <Text style={styles.tableCell}>${(item.quantity * item.price).toFixed(2)}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totals}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{labels.subtotal}:</Text>
                        <Text style={styles.totalValue}>${(quote.total - quote.tax).toFixed(2)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{labels.tax}:</Text>
                        <Text style={styles.totalValue}>${quote.tax.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 5 }]}>
                        <Text style={[styles.totalLabel, { fontSize: 12 }]}>{labels.grandTotal}:</Text>
                        <Text style={[styles.totalValue, { fontSize: 12, fontWeight: 'bold' }]}>${quote.total.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Terms */}
                {quote.terms && (
                    <View style={{ marginTop: 30 }}>
                        <Text style={styles.sectionTitle}>{labels.terms}:</Text>
                        <Text style={styles.text}>{quote.terms}</Text>
                    </View>
                )}

                {/* Footer */}
                <Text style={styles.footer}>Generated by Antigravity System</Text>
            </Page>
        </Document>
    );
};
