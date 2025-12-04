import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import axios from 'axios';
import { API_URL } from '../config';
import { format } from 'date-fns';

type JobListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'JobList'>;
type JobListScreenRouteProp = RouteProp<RootStackParamList, 'JobList'>;

interface Job {
    id: string;
    scheduledAt: string;
    status: string;
    description: string;
    property: {
        address: string;
        client: {
            name: string;
        };
    };
}

export default function JobListScreen() {
    const navigation = useNavigation<JobListScreenNavigationProp>();
    const route = useRoute<JobListScreenRouteProp>();
    const { userId } = route.params;
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchJobs = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/technician/jobs?techId=${userId}`);
            setJobs(response.data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch jobs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, [userId]);

    const renderItem = ({ item }: { item: Job }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('JobDetails', { jobId: item.id })}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.time}>{format(new Date(item.scheduledAt), 'p')}</Text>
                <View style={[styles.badge,
                item.status === 'IN_PROGRESS' ? styles.badgeActive :
                    item.status === 'COMPLETED' ? styles.badgeCompleted :
                        styles.badgePending
                ]}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                </View>
            </View>

            <Text style={styles.clientName}>{item.property.client.name}</Text>
            <Text style={styles.address}>{item.property.address}</Text>
            <Text style={styles.jobType}>{item.description || 'No description'}</Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Schedule</Text>
                <Text style={styles.date}>{format(new Date(), 'EEEE, MMM d')}</Text>
            </View>

            <FlatList
                data={jobs}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshing={loading}
                onRefresh={fetchJobs}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No jobs scheduled for today.</Text>
                }
            />

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
    header: {
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    date: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
    listContent: {
        padding: 20,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    time: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2563eb',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
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
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
    },
    clientName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    address: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    jobType: {
        fontSize: 14,
        color: '#4b5563',
        fontStyle: 'italic',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#999',
        fontSize: 16,
    },
});
