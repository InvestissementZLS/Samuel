import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Job, Client, UsedProduct, Product, User } from '@prisma/client';
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
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 20,
    },
    logoSection: {
        width: '50%',
    },
    titleSection: {
        width: '50%',
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#4F46E5', // Indigo
    },
    subtitle: {
        fontSize: 10,
        color: '#666',
        marginTop: 5,
    },
    section: {
        marginTop: 15,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#111827',
        backgroundColor: '#F3F4F6',
        padding: 5,
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    col: {
        flex: 1,
    },
    label: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#6B7280',
        marginBottom: 2,
    },
    value: {
        fontSize: 10,
        color: '#111827',
    },
    table: {
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        padding: 5,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        padding: 5,
    },
    tableCol: {
        flex: 1,
        fontSize: 9,
    },
    notes: {
        marginTop: 10,
        fontSize: 10,
        padding: 10,
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FCD34D',
        borderRadius: 4,
    },
    signatures: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 40,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    signatureBlock: {
        width: '45%',
        alignItems: 'center',
    },
    signatureImage: {
        width: 100,
        height: 50,
        marginBottom: 10,
    },
    signatureLine: {
        borderTopWidth: 1,
        borderTopColor: '#000',
        width: '100%',
        marginTop: 5,
        marginBottom: 5,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 8,
        color: '#9CA3AF',
    },
});

interface ServiceReportProps {
    job: Job & {
        client: Client;
        property: any;
        products: (UsedProduct & { product: Product })[];
        technicians: User[];
    };
    language?: 'EN' | 'FR';
}

export const ServiceReportPDF = ({ job, language = 'FR' }: ServiceReportProps) => {
    const isEn = language === 'EN';
    const locale = isEn ? enUS : fr;

    const t = {
        title: isEn ? "Service Report" : "Rapport de Service",
        subtitle: isEn ? `Job #${job.id.slice(0, 8)}` : `Tâche #${job.id.slice(0, 8)}`,
        client: isEn ? "Client" : "Client",
        serviceLoc: isEn ? "Service Location" : "Lieu de Service",
        date: isEn ? "Date" : "Date",
        time: isEn ? "Time" : "Heure",
        technician: isEn ? "Technician" : "Technicien",
        products: isEn ? "Products Used" : "Produits Utilisés",
        qty: isEn ? "Qty" : "Qté",
        product: isEn ? "Product" : "Produit",
        notes: isEn ? "Notes & Observations" : "Notes & Observations",
        signatures: isEn ? "Signatures" : "Signatures",
        clientSig: isEn ? "Client Signature" : "Signature du Client",
        techSig: isEn ? "Technician Signature" : "Signature du Technicien",
        start: isEn ? "Started" : "Débuté",
        end: isEn ? "Completed" : "Terminé",
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoSection}>
                        <Text style={{ fontWeight: 'bold', fontSize: 14 }}>
                            {job.division === 'EXTERMINATION' ? 'Extermination ZLS' : 'Les Entreprises ZLS'}
                        </Text>
                    </View>
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>{t.title}</Text>
                        <Text style={styles.subtitle}>{t.subtitle}</Text>
                    </View>
                </View>

                {/* Info Grid */}
                <View style={{ flexDirection: 'row', gap: 20 }}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.sectionTitle}>
                            <Text>{t.client}</Text>
                        </View>
                        <View style={{ marginBottom: 10 }}>
                            <Text style={styles.value}>{job.client.name}</Text>
                            <Text style={styles.value}>{job.client.email}</Text>
                            <Text style={styles.value}>{job.client.phone}</Text>
                        </View>

                        <View style={styles.sectionTitle}>
                            <Text>{t.serviceLoc}</Text>
                        </View>
                        <View>
                            <Text style={styles.value}>{job.property.address}</Text>
                            {job.property.city && <Text style={styles.value}>{job.property.city}</Text>}
                        </View>
                    </View>

                    <View style={{ flex: 1 }}>
                        <View style={styles.sectionTitle}>
                            <Text>Détails</Text>
                        </View>
                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={styles.label}>{t.date}</Text>
                                <Text style={styles.value}>
                                    {job.scheduledAt ? format(new Date(job.scheduledAt), 'PPP', { locale }) : '-'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={styles.label}>{t.start}</Text>
                                <Text style={styles.value}>
                                    {job.startedAt ? format(new Date(job.startedAt), 'p', { locale }) : '-'}
                                </Text>
                            </View>
                            <View style={styles.col}>
                                <Text style={styles.label}>{t.end}</Text>
                                <Text style={styles.value}>
                                    {job.completedAt ? format(new Date(job.completedAt), 'p', { locale }) : '-'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={styles.label}>{t.technician}</Text>
                                <Text style={styles.value}>
                                    {job.technicians.map(t => t.name).join(', ')}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Products Used */}
                {job.products && job.products.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t.products}</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableCol, { flex: 3 }]}>{t.product}</Text>
                                <Text style={styles.tableCol}>{t.qty}</Text>
                                <Text style={[styles.tableCol, { flex: 2 }]}>Unit</Text>
                            </View>
                            {job.products.map((p, i) => (
                                <View style={styles.tableRow} key={i}>
                                    <Text style={[styles.tableCol, { flex: 3 }]}>{p.product.name}</Text>
                                    <Text style={styles.tableCol}>{p.quantity}</Text>
                                    <Text style={[styles.tableCol, { flex: 2 }]}>{p.product.unit}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Report Notes */}
                {job.reportNotes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t.notes}</Text>
                        <Text style={styles.notes}>{job.reportNotes}</Text>
                    </View>
                )}

                {/* Signatures */}
                <View style={styles.signatures}>
                    <View style={styles.signatureBlock}>
                        {job.technicianSignature && (
                            <Image src={job.technicianSignature} style={styles.signatureImage} />
                        )}
                        <View style={styles.signatureLine} />
                        <Text style={styles.label}>{t.techSig}</Text>
                        <Text style={styles.value}>{job.technicians[0]?.name}</Text>
                    </View>

                    <View style={styles.signatureBlock}>
                        {job.clientSignature && (
                            <Image src={job.clientSignature} style={styles.signatureImage} />
                        )}
                        <View style={styles.signatureLine} />
                        <Text style={styles.label}>{t.clientSig}</Text>
                        <Text style={styles.value}>{job.client.name}</Text>
                    </View>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    {job.division === 'EXTERMINATION' ? 'Extermination ZLS' : 'Les Entreprises ZLS'} - Service Report
                </Text>
            </Page>
        </Document>
    );
};
