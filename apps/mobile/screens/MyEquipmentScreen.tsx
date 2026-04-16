import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LucideTruck, LucidePackageSearch, LucideWrench } from 'lucide-react-native';
import api from '../services/api';

export default function MyEquipmentScreen() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'DEPLOYABLE' | 'TOOLS'>('DEPLOYABLE');
    const [deployable, setDeployable] = useState<any[]>([]);
    const [tools, setTools] = useState<any[]>([]);

    useEffect(() => {
        loadEquipment();
    }, []);

    const loadEquipment = async () => {
        try {
            setLoading(true);
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) return;

            const res = await api.get(`/api/equipment?userId=${userId}`);
            
            setDeployable(res.data.deployable || []);
            setTools(res.data.tools || []);
        } catch (error) {
            console.error("Failed to load equipment", error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.productName}>{item.product.name}</Text>
                <View style={styles.tagBadge}>
                    <Text style={styles.tagText}>{item.assetTag}</Text>
                </View>
            </View>
            <Text style={styles.serialText}>S/N: {item.serialNumber || 'Non spécifié'}</Text>
            {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            {/* Header / Tabs */}
            <View style={styles.header}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'DEPLOYABLE' && styles.activeTab]}
                        onPress={() => setActiveTab('DEPLOYABLE')}
                    >
                        <LucidePackageSearch size={20} color={activeTab === 'DEPLOYABLE' ? '#1e40af' : '#6b7280'} />
                        <Text style={[styles.tabText, activeTab === 'DEPLOYABLE' && styles.activeTabText]}>
                            Cages & Caméras ({deployable.length})
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'TOOLS' && styles.activeTab]}
                        onPress={() => setActiveTab('TOOLS')}
                    >
                        <LucideWrench size={20} color={activeTab === 'TOOLS' ? '#1e40af' : '#6b7280'} />
                        <Text style={[styles.tabText, activeTab === 'TOOLS' && styles.activeTabText]}>
                            Outils ({tools.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#1e40af" />
                </View>
            ) : (
                <FlatList
                    data={activeTab === 'DEPLOYABLE' ? deployable : tools}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshing={loading}
                    onRefresh={loadEquipment}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <LucideTruck size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>Aucun équipement assigné à votre camion.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 6,
        gap: 8,
    },
    activeTab: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    activeTabText: {
        color: '#1e40af',
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    productName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        flex: 1,
    },
    tagBadge: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    tagText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1d4ed8',
    },
    serialText: {
        fontSize: 13,
        color: '#6b7280',
    },
    notesText: {
        fontSize: 13,
        color: '#4b5563',
        marginTop: 6,
        fontStyle: 'italic',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 15,
        color: '#94a3b8',
        fontWeight: '500',
    }
});
