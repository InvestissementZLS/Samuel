import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import axios from 'axios';
import { API_URL } from '../config';
import { format } from 'date-fns';
import { LucideMapPin, LucidePhone, LucideClock, LucideFileText } from 'lucide-react-native';

type JobDetailsScreenRouteProp = RouteProp<RootStackParamList, 'JobDetails'>;

interface JobDetail {
    id: string;
    scheduledAt: string;
    status: string;
    description: string;
    property: {
        address: string;
        client: {
            name: string;
            phone: string | null;
            email: string | null;
        };
    };
    notes: { id: string; content: string }[];
    products: { product: { name: string; unit: string }; quantity: number }[];
}

export default function JobDetailsScreen() {
    const route = useRoute<JobDetailsScreenRouteProp>();
    const { jobId } = route.params;
    const [job, setJob] = useState<JobDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const fetchJobDetails = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/jobs/${jobId}`);
            setJob(response.data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch job details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobDetails();
    }, [jobId]);

    const updateStatus = async (newStatus: string) => {
        setUpdating(true);
        try {
            await axios.patch(`${API_URL}/api/jobs/${jobId}`, { status: newStatus });
            setJob(prev => prev ? { ...prev, status: newStatus } : null);
            Alert.alert('Success', `Job marked as ${newStatus}`);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const openMap = () => {
        if (job?.property.address) {
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.property.address)}`;
            Linking.openURL(url);
        }
    };

    const callClient = () => {
        if (job?.property.client.phone) {
            Linking.openURL(`tel:${job.property.client.phone}`);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (!job) {
        return (
            <View style={styles.centered}>
                <Text>Job not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.statusLabel}>Status</Text>
                    <View style={[styles.badge,
                    job.status === 'IN_PROGRESS' ? styles.badgeActive :
                        job.status === 'COMPLETED' ? styles.badgeCompleted :
                            styles.badgePending
                    ]}>
                        <Text style={styles.badgeText}>{job.status}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Client Info</Text>
                    <Text style={styles.clientName}>{job.property.client.name}</Text>

                    <TouchableOpacity style={styles.row} onPress={openMap}>
                        <LucideMapPin size={20} color="#666" />
                        <Text style={styles.rowText}>{job.property.address}</Text>
                    </TouchableOpacity>

                    {job.property.client.phone && (
                        <TouchableOpacity style={styles.row} onPress={callClient}>
                            <LucidePhone size={20} color="#666" />
                            <Text style={styles.rowText}>{job.property.client.phone}</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={[styles.actionButton, styles.navigateButton]} onPress={openMap}>
                        <LucideMapPin size={24} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.actionButtonText}>Navigate to Client</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Job Details</Text>
                    <View style={styles.row}>
                        <LucideClock size={20} color="#666" />
                        <Text style={styles.rowText}>{format(new Date(job.scheduledAt), 'PPpp')}</Text>
                    </View>
                    <View style={styles.row}>
                        <LucideFileText size={20} color="#666" />
                        <Text style={styles.rowText}>{job.description || 'No description provided.'}</Text>
                    </View>
                </View>

                {job.products.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Products Used</Text>
                        {job.products.map((p, index) => (
                            <View key={index} style={styles.productRow}>
                                <Text style={styles.productName}>{p.product.name}</Text>
                                <Text style={styles.productQty}>{p.quantity} {p.product.unit}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.actions}>
                    {job.status === 'SCHEDULED' && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.startButton]}
                            onPress={() => updateStatus('IN_PROGRESS')}
                            disabled={updating}
                        >
                            <Text style={styles.actionButtonText}>Start Job</Text>
                        </TouchableOpacity>
                    )}

                    {job.status === 'IN_PROGRESS' && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.completeButton]}
                            onPress={() => updateStatus('COMPLETED')}
                            disabled={updating}
                        >
                            <Text style={styles.actionButtonText}>Complete Job</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
            <StatusBar style="auto" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    statusLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#e0e7ff',
    },
    badgeActive: {
        backgroundColor: '#dcfce7',
    },
    badgeCompleted: {
        backgroundColor: '#d1fae5',
    },
    badgePending: {
        backgroundColor: '#f3f4f6',
    },
    badgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    clientName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    rowText: {
        fontSize: 16,
        color: '#4b5563',
        marginLeft: 12,
        flex: 1,
    },
    productRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    productName: {
        fontSize: 16,
        color: '#333',
    },
    productQty: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    actions: {
        marginTop: 20,
    },
    actionButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    startButton: {
        backgroundColor: '#2563eb',
    },
    completeButton: {
        backgroundColor: '#16a34a',
    },
    navigateButton: {
        backgroundColor: '#8B5CF6', // Violet/Purple to distinguish from actions
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    actionButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
