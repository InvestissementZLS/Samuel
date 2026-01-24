import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
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
    logo: {
        width: 100,
        height: 80,
        marginBottom: 10,
        objectFit: 'contain',
        alignSelf: 'flex-end'
    },
    companyInfo: {
        fontSize: 10,
        color: '#555',
        alignItems: 'flex-end', // Ensure right alignment for all elements including logo
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
    logoPath?: string;
}

const t = {
    EN: {
        invoice: "INVOICE",
        billTo: "Bill To",
        date: "Date",
        dueDate: "Due Date",
        item: "Service",
        description: "Description",
        quantity: "Qty",
        price: "Price",
        total: "Total",
        subtotal: "Subtotal",
        tax: "Tax",
        grandTotal: "Grand Total",
        thankYou: "Thank you for your business!",
        warranty: "Warranty",
        phone: "Phone",
        email: "Email"
    },
    FR: {
        invoice: "FACTURE",
        billTo: "Facturé à",
        date: "Date",
        dueDate: "Échéance",
        item: "Service",
        description: "Description",
        quantity: "Qté",
        price: "Prix",
        total: "Total",
        subtotal: "Sous-total",
        tax: "Taxes",
        grandTotal: "Grand Total",
        thankYou: "Merci de votre confiance !",
        warranty: "Garantie",
        phone: "Tél",
        email: "Courriel"
    }
};

export const InvoicePDF = ({ invoice, language = "FR", logoPath }: InvoicePDFProps) => {
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
                        <Image
                            style={styles.logo}
                            src={logoPath || (invoice.division === "RENOVATION" ? "/renovation-logo.png" : "/zls-logo.png")}
                        />
                        <Text style={{ fontWeight: 'bold', fontSize: 12 }}>
                            {invoice.division === "EXTERMINATION"
                                ? "Extermination ZLS"
                                : invoice.division === "RENOVATION"
                                    ? "Rénovation Esthéban"
                                    : "Les Entreprises ZLS"}
                        </Text>
                        {invoice.division === "EXTERMINATION" ? (
                            <>
                                <Text>1267 rue Des Chênes</Text>
                                <Text>Prévost, Québec, Canada J0R 1T0</Text>
                                <Text>{labels.phone}: (514) 963-4010</Text>
                                <Text>{labels.email}: exterminationzls@gmail.com</Text>
                            </>
                        ) : invoice.division === "RENOVATION" ? (
                            <>
                                <Text>No de licence: 56084320-01</Text>
                                <Text>TPS: 826459653RT0001</Text>
                                <Text>TVQ: 1216098842TQ0001</Text>
                            </>
                        ) : (
                            <>
                                <Text>123 Business St.</Text>
                                <Text>City, State, Zip</Text>
                                <Text>{labels.phone}: (555) 123-4567</Text>
                                <Text>{labels.email}: info@zls.com</Text>
                            </>
                        )}
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

                {/* Comments / Special Instructions (Renovation Only or if Note exists) */}
                {invoice.notes && (
                    <View style={{ marginTop: 20 }}>
                        <Text style={styles.sectionTitle}>{language === 'FR' ? "Commentaires ou instructions spéciales" : "Comments or special instructions"}</Text>
                        <Text style={styles.text}>{invoice.notes}</Text>
                    </View>
                )}

                {/* Items Table - Conditional Layout */}
                {invoice.division === "RENOVATION" ? (
                    // RENOVATION LAYOUT: Qty | Desc | Price | Taxable | Total
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <View style={{ ...styles.tableCol, width: '15%' }}>
                                <Text style={styles.tableCell}>{labels.quantity}</Text>
                            </View>
                            <View style={{ ...styles.tableColDesc, width: '45%' }}>
                                <Text style={styles.tableCell}>{labels.description}</Text>
                            </View>
                            <View style={{ ...styles.tableCol, width: '15%' }}>
                                <Text style={styles.tableCell}>{labels.price}</Text>
                            </View>
                            <View style={{ ...styles.tableCol, width: '10%' }}>
                                <Text style={styles.tableCell}>Taxable</Text>
                            </View>
                            <View style={{ ...styles.tableCol, width: '15%' }}>
                                <Text style={styles.tableCell}>{labels.total}</Text>
                            </View>
                        </View>
                        {invoice.items.map((item, index) => (
                            <View style={styles.tableRow} key={index}>
                                <View style={{ ...styles.tableCol, width: '15%' }}>
                                    <Text style={styles.tableCell}>{String(item.quantity)}</Text>
                                </View>
                                <View style={{ ...styles.tableColDesc, width: '45%' }}>
                                    <Text style={styles.tableCell}>
                                        {item.product?.name || item.description || "Item"}
                                    </Text>
                                    {item.description && item.product?.name && item.description !== item.product.name && (
                                        <Text style={[styles.text, { color: '#555', fontSize: 9, fontStyle: 'italic', marginBottom: 2 }]}>
                                            {item.description}
                                        </Text>
                                    )}
                                </View>
                                <View style={{ ...styles.tableCol, width: '15%' }}>
                                    <Text style={styles.tableCell}>${Number(item.price).toFixed(2)} / {item.product?.unit ? (language === 'FR' && item.product.unit === 'sqft' ? 'pi²' : item.product.unit) : 'unit'}</Text>
                                </View>
                                <View style={{ ...styles.tableCol, width: '10%' }}>
                                    {/* Assume taxable if taxRate > 0 or default true if unknown, strictly strictly checking taxRate if available */}
                                    <Text style={styles.tableCell}>{(item.taxRate && item.taxRate > 0) || !item.taxRate ? (language === 'FR' ? "Oui" : "Yes") : (language === 'FR' ? "Non" : "No")}</Text>
                                </View>
                                <View style={{ ...styles.tableCol, width: '15%' }}>
                                    <Text style={styles.tableCell}>${(Number(item.quantity) * Number(item.price)).toFixed(2)}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    // STANDARD LAYOUT (Extermination / Default)
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
                                        {item.product?.name || item.description || "Item"}
                                    </Text>
                                    {item.description && item.product?.name && item.description !== item.product.name && (
                                        <Text style={[styles.text, { color: '#555', fontSize: 9, fontStyle: 'italic', marginBottom: 2 }]}>
                                            {item.description}
                                        </Text>
                                    )}
                                    {item.product.description && (
                                        <Text style={[styles.text, { color: '#666', fontSize: 8, marginTop: 2 }]}>
                                            {item.product.description}
                                        </Text>
                                    )}
                                    {item.product.warrantyInfo && (
                                        <Text style={[styles.text, { color: '#444', fontSize: 8, fontWeight: 'bold', marginTop: 4 }]}>
                                            {item.product.warrantyInfo}
                                        </Text>
                                    )}
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
                )}

                {/* Totals */}
                <View style={styles.totals}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{labels.subtotal}:</Text>
                        <Text style={styles.totalValue}>${Number(invoice.total - (invoice.tax || 0)).toFixed(2)}</Text>
                    </View>
                    {/* Split Taxes */}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>TPS (5%):</Text>
                        <Text style={styles.totalValue}>${(Number(invoice.total - (invoice.tax || 0)) * 0.05).toFixed(2)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>TVQ (9.975%):</Text>
                        <Text style={styles.totalValue}>${(Number(invoice.total - (invoice.tax || 0)) * 0.09975).toFixed(2)}</Text>
                    </View>
                    <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 5 }]}>
                        <Text style={[styles.totalLabel, { fontSize: 12 }]}>{labels.grandTotal}:</Text>
                        <Text style={[styles.totalValue, { fontSize: 12, fontWeight: 'bold' }]}>${Number(invoice.total).toFixed(2)}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    {invoice.division === "RENOVATION" ? (
                        <View style={{ alignItems: 'flex-start', textAlign: 'left', width: '100%' }}>
                            <Text style={{ fontSize: 9, marginBottom: 2 }}>
                                {language === 'FR'
                                    ? "*Veuillez noter que la facturation pour les travaux d'isolation sera émise par l'entrepreneur en isolation (prix discuté directement avec eux)."
                                    : "*Please note that the billing for the insulation work will be issued by the insulation contractor (price discussed directly with them)."}
                            </Text>
                            <Text style={{ fontSize: 9, marginBottom: 2 }}>
                                {language === 'FR'
                                    ? "Garantie limitée à vie du fabricant sur l'isolant de cellulose"
                                    : "Limited lifetime manufacturer's warranty on the cellulose insulation"}
                            </Text>
                            <Text style={{ fontSize: 9, marginBottom: 10 }}>
                                {language === 'FR'
                                    ? "Garantie de 2 ans sur la main-d'œuvre pour l'installation"
                                    : "2-year workmanship warranty on the installation"}
                            </Text>
                            <Text style={{ textAlign: 'center', width: '100%', fontSize: 10, fontWeight: 'bold' }}>
                                {language === 'FR' ? "Nous vous remercions de votre confiance." : "We thank you for your trust."}
                            </Text>
                        </View>
                    ) : (
                        <View>
                            <Text>{labels.thankYou}</Text>
                            {invoice.division === "EXTERMINATION" && (
                                <Text style={{ marginTop: 4, fontSize: 8, color: '#999' }}>
                                    TPS: 789615226RT0001 | TVQ: 1231249636TQ0001
                                </Text>
                            )}
                        </View>
                    )}
                </View>
            </Page>
        </Document>
    );
};
