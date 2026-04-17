import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // P-03 FIX
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import api, { STORAGE_KEYS } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalJobs, getOutbox } from '../lib/db';
import { syncData } from '../lib/sync';
import { optimizeRoute } from '../lib/ai';
import { format } from 'date-fns';
import * as Location from 'expo-location';
import { DailyRunJob } from '../lib/run-schema';
import { LucidePhone, LucideSettings, LucideTruck, LucidePackage, LucideFileText, LucideBox, LucideReceipt, LucideScanBarcode } from 'lucide-react-native';

// P-01 FIX: French status labels
const STATUS_LABELS: Record<string, string> = {
    SCHEDULED: 'Planifié',
    EN_ROUTE: 'En Route',
    IN_PROGRESS: 'En Cours',
    COMPLETED: 'Terminé',
    PENDING: 'En attente',
    CANCELLED: 'Annulé',
};

type JobListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'JobList'>;
type JobListScreenRouteProp = RouteProp<RootStackParamList, 'JobList'>;

// Replaced by DailyRunJob

export default function JobListScreen() {
    const navigation = useNavigation<JobListScreenNavigationProp>();
    const route = useRoute<JobListScreenRouteProp>();
    const { userId } = route.params;
    const [jobs, setJobs] = useState<DailyRunJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [optimizing, setOptimizing] = useState(false); // P-05 FIX: separate optimizing state
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [punchStatus, setPunchStatus] = useState<'OPEN' | 'CLOSED' | 'LOADING' | 'ERROR'>('LOADING');
    const [activeTimesheetId, setActiveTimesheetId] = useState<string | null>(null);
    const [punchLoading, setPunchLoading] = useState(false);

    const [syncState, setSyncState] = useState('SYNCED');

    // M-09 FIX: Division filtering
    const [userDivisions, setUserDivisions] = useState<string[]>(['EXTERMINATION']);
    const [activeDivision, setActiveDivision] = useState<string>('EXTERMINATION');

    const loadSettings = async () => {
        try {
            const divisionsRaw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DIVISIONS);
            if (divisionsRaw) {
                const parsed = JSON.parse(divisionsRaw);
                setUserDivisions(parsed);
                if (parsed.length > 0) setActiveDivision(parsed[0]);
            }
        } catch (error) {
            console.error("Failed to load user settings", error);
        }
    }

    const loadJobs = async () => {
        // 1. Load Local Immediately
        const local = getLocalJobs();
        if (local.length > 0) {
            setJobs(local);
            setLoading(false);
        }

        // 2. Sync with Server
        try {
            const fresh = await syncData(userId, selectedDate.toISOString());
            if (fresh) setJobs(fresh);
        } catch (error) {
            console.log("Sync failed, staying with local");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings().then(() => {
            loadJobs();
            checkPunchStatus();
        });

        // Poll for outbox status occasionally? Or rely on focus?
        // simple interval to check queue size
        const interval = setInterval(() => {
            const queue = getOutbox();
            setSyncState(queue.length > 0 ? 'PENDING_UPLOAD' : 'SYNCED');
        }, 5000);
        return () => clearInterval(interval);
    }, [userId, selectedDate]);

    const checkPunchStatus = async () => {
        try {
            const response = await api.get(`/api/timesheets/active?userId=${userId}`);
            const ts = response.data.timesheet;
            if (ts) {
                setPunchStatus('OPEN');
                setActiveTimesheetId(ts.id);
            } else {
                setPunchStatus('CLOSED');
                setActiveTimesheetId(null);
            }
        } catch (error) {
            // P-07 FIX: Don't silently reset to CLOSED on error — could create duplicate punch-ins
            // Instead, show ERROR state so the technician knows something is wrong.
            console.error('Failed to check punch status:', error);
            setPunchStatus(prev => prev === 'LOADING' ? 'ERROR' : prev); // Keep existing state if known
            setActiveTimesheetId(null);
        }
    };

    const handlePunch = () => {
        if (punchStatus === 'OPEN' && activeTimesheetId) {
            navigation.navigate('PunchOut', { timesheetId: activeTimesheetId });
        } else if (punchStatus === 'CLOSED') {
            navigation.navigate('PunchIn', { userId });
        }
    };

    const formatTimeSafe = (dateString: string | Date | undefined) => {
        if (!dateString) return 'Heure Inconnue';
        try {
            return format(new Date(dateString), 'p');
        } catch(e) {
            return 'Heure Invalide';
        }
    };

    const renderItem = ({ item }: { item: DailyRunJob }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('JobDetails', { jobId: item.id })}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.time}>{formatTimeSafe(item.scheduledAt)}</Text>
                <View style={[styles.badge,
                item.status === 'IN_PROGRESS' ? styles.badgeActive :
                    item.status === 'COMPLETED' ? styles.badgeCompleted :
                    item.status === 'EN_ROUTE' ? styles.badgeEnRoute :
                        styles.badgePending
                ]}>
                    {/* P-01 FIX: French status labels */}
                    <Text style={styles.badgeText}>{STATUS_LABELS[item.status] ?? item.status}</Text>
                </View>
            </View>

            <Text style={styles.clientName}>{item.property?.client?.name || 'Client Inconnu'}</Text>
            <Text style={styles.address}>{item.property?.address || 'Adresse Inconnue'}</Text>
            <Text style={styles.jobType}>{item.description || 'Aucune description'}</Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    const handleOptimize = async () => {
        // P-05 FIX: Use separate optimizing state — don't hide the full job list during optimization
        setOptimizing(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission refusée', 'La localisation est nécessaire pour optimiser la route.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const optimized = optimizeRoute(
                location.coords.latitude,
                location.coords.longitude,
                jobs
            );
            setJobs(optimized as DailyRunJob[]);
            Alert.alert("Route Optimisée ⚡", "Jobs réordonnés pour le trajet le plus court!");
        } catch (error) {
            console.error("Optimization failed", error);
            Alert.alert("Erreur", "Impossible d'optimiser la route.");
        } finally {
            setOptimizing(false);
        }
    };

    // Filter jobs by division
    const filteredJobs = jobs.filter(j => j.division === activeDivision);

    return (
        // P-03 FIX: SafeAreaView prevents content being cut by notch/Dynamic Island/status bar
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* P-05 FIX: Overlay spinner — does not hide the job list */}
            {optimizing && (
                <View style={styles.optimizingOverlay}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={{ color: 'white', marginTop: 8, fontWeight: '600' }}>Optimisation...</Text>
                </View>
            )}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.headerTitle}>Mon Horaire</Text>
                        {syncState === 'PENDING_UPLOAD' && (
                            <View style={{ marginLeft: 10, backgroundColor: '#f59e0b', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                                <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>WAITING FOR WIFI</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[styles.punchBtn,
                            punchStatus === 'OPEN' ? styles.punchOut :
                            punchStatus === 'ERROR' ? styles.punchError :
                            styles.punchIn
                        ]}
                        onPress={punchStatus === 'ERROR' ? checkPunchStatus : handlePunch}
                        disabled={punchLoading || punchStatus === 'LOADING'}
                    >
                        {punchLoading ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Text style={styles.punchBtnText}>
                                {punchStatus === 'OPEN' ? '🔴 Fin de journée' :
                                 punchStatus === 'ERROR' ? '⚠️ Réessayer' :
                                 '🟢 Début journée'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Date Navigator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 12, gap: 15 }}>
                    <TouchableOpacity onPress={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() - 1);
                        setSelectedDate(d);
                    }}>
                        <Text style={{ fontSize: 24, paddingHorizontal: 10 }}>⬅️</Text>
                    </TouchableOpacity>
                    <Text style={[styles.date, { marginTop: 0, fontWeight: 'bold' }]}>{format(selectedDate, 'EEEE, MMM d')}</Text>
                    <TouchableOpacity onPress={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() + 1);
                        setSelectedDate(d);
                    }}>
                        <Text style={{ fontSize: 24, paddingHorizontal: 10 }}>➡️</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions Grid - Refactored */}
                <View style={styles.quickActionsGrid}>
                    <TouchableOpacity 
                        style={[styles.gridBtn]} 
                        onPress={() => navigation.navigate('QuickAddJob', { userId })}
                    >
                        <LucidePhone size={24} color="#1e40af" />
                        <Text style={styles.gridBtnTextBtn}>Appel Urgent</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.gridBtn]} 
                        onPress={handleOptimize}
                    >
                        <LucideScanBarcode size={24} color="#16a34a" />
                        <Text style={styles.gridBtnTextBtn}>Optimiser Route</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.gridBtn, { backgroundColor: '#e0e7ff', borderColor: '#c7d2fe', borderWidth: 1 }]} 
                        onPress={() => navigation.navigate('MyEquipment' as any)}
                    >
                        <LucideTruck size={24} color="#4338ca" />
                        <Text style={[styles.gridBtnTextBtn, { color: '#4338ca', fontWeight: 'bold' }]}>Mon Camion</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.gridBtn]} 
                        onPress={() => navigation.navigate('Inventory')}
                    >
                        <LucideBox size={24} color="#4b5563" />
                        <Text style={styles.gridBtnTextBtn}>Inventaire</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.gridBtn]} 
                        onPress={() => navigation.navigate('AddExpense', { userId })}
                    >
                        <LucideReceipt size={24} color="#d97706" />
                        <Text style={styles.gridBtnTextBtn}>Dépense</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.gridBtn]} 
                        onPress={() => navigation.navigate('CreateQuote')}
                    >
                        <LucideFileText size={24} color="#0369a1" />
                        <Text style={styles.gridBtnTextBtn}>Soumission</Text>
                    </TouchableOpacity>
                </View>
                
                {/* Division Tabs (Only show if user has > 1 division) */}
                {userDivisions.length > 1 && (
                    <View style={styles.divisionTabs}>
                        {userDivisions.map(div => (
                            <TouchableOpacity
                                key={div}
                                style={[
                                    styles.divisionTab,
                                    activeDivision === div && styles.divisionTabActive
                                ]}
                                onPress={() => setActiveDivision(div)}
                            >
                                <Text style={[
                                    styles.divisionTabText,
                                    activeDivision === div && styles.divisionTabTextActive
                                ]}>
                                    {String(div).charAt(0).toUpperCase() + String(div).slice(1).toLowerCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <FlatList
                data={filteredJobs}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshing={loading}
                onRefresh={loadJobs}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Aucun job planifié pour aujourd'hui.</Text>
                }
            />

            <StatusBar style="auto" />
        </SafeAreaView>
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
    divisionTabs: {
        flexDirection: 'row',
        marginTop: 15,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        padding: 4,
    },
    divisionTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    divisionTabActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    divisionTabText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
    },
    divisionTabTextActive: {
        color: '#111827',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    punchBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 2,
    },
    punchIn: {
        backgroundColor: '#16a34a', // Green
    },
    punchOut: {
        backgroundColor: '#dc2626', // Red
    },
    punchBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
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
    badgeEnRoute: {
        backgroundColor: '#ffedd5',
    },
    badgePending: {
        backgroundColor: '#f3f4f6',
    },
    punchError: {
        backgroundColor: '#f59e0b',
    },
    optimizingOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 999, justifyContent: 'center', alignItems: 'center',
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
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 10,
        justifyContent: 'space-between',
    },
    gridBtn: {
        width: '31%',
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    gridBtnTextBtn: {
        fontSize: 11,
        color: '#4b5563',
        fontWeight: '600',
        marginTop: 6,
        textAlign: 'center'
    }
});
