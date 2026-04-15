import React, { useEffect, useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView,
    Platform, Modal, FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { InventoryItem } from '../lib/schemas';

// ─── Types ───────────────────────────────────────────────────────────────────
interface EquipmentItem {
    id: string;
    quantity: number;
    product: {
        id: string;
        name: string;
        unit: string;
        description?: string;
    };
}

interface AvailableEquipment {
    id: string;
    name: string;
    unit: string;
    description?: string;
    stock: number;
}

type MainTab = 'CONSUMABLES' | 'EQUIPMENT';
type ConsumableMode = 'AUDIT' | 'RETURN';

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function InventoryScreen() {
    const navigation = useNavigation();

    // Main tab: Consommables vs Équipements/Outils
    const [mainTab, setMainTab] = useState<MainTab>('CONSUMABLES');

    // ── CONSUMABLES state ─────────────────────────────────────────────────────
    const [consumableMode, setConsumableMode] = useState<ConsumableMode>('AUDIT');
    const [loadingConsumables, setLoadingConsumables] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [counts, setCounts] = useState<{ [key: string]: string }>({});

    // ── EQUIPMENT state ───────────────────────────────────────────────────────
    const [loadingEquipment, setLoadingEquipment] = useState(false);
    const [assignedEquipment, setAssignedEquipment] = useState<EquipmentItem[]>([]);
    const [allEquipment, setAllEquipment] = useState<AvailableEquipment[]>([]);
    const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null); // productId being acted on

    // Load on tab change
    useEffect(() => {
        if (mainTab === 'CONSUMABLES') fetchConsumables();
        else fetchEquipment();
    }, [mainTab]);

    // ─── CONSUMABLES API ──────────────────────────────────────────────────────
    const fetchConsumables = async () => {
        setLoadingConsumables(true);
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) { Alert.alert('Erreur', 'Utilisateur introuvable'); return; }

            const res = await api.get(`/api/inventory/audit?userId=${userId}`);
            // Filter to CONSUMABLE type only
            const consumables = (res.data as InventoryItem[]).filter(
                (item: any) => !item.product?.type || item.product?.type === 'CONSUMABLE'
            );

            const initialCounts: { [key: string]: string } = {};
            consumables.forEach((item: InventoryItem) => {
                initialCounts[item.product.id] = item.quantity.toString();
            });

            setInventory(consumables);
            setCounts(initialCounts);
        } catch (error) {
            console.error(error);
            Alert.alert('Erreur', 'Impossible de charger l\'inventaire');
        } finally {
            setLoadingConsumables(false);
        }
    };

    const handleCountChange = (productId: string, text: string) => {
        setCounts(prev => ({ ...prev, [productId]: text }));
    };

    const confirmAll = () => {
        const confirmed: { [key: string]: string } = {};
        inventory.forEach(item => {
            confirmed[item.product.id] = item.quantity.toString();
        });
        setCounts(confirmed);
    };

    const submitConsumableAction = async () => {
        setSubmitting(true);
        try {
            const userId = await AsyncStorage.getItem('userId');

            if (consumableMode === 'AUDIT') {
                const items = inventory.map(item => ({
                    productId: item.product.id,
                    actualQuantity: parseInt(counts[item.product.id] || '0', 10),
                    notes: '',
                }));
                await api.post('/api/inventory/audit', { userId, items });
                Alert.alert('✅ Audit soumis', 'L\'inventaire a été mis à jour.');
                navigation.goBack();
            } else {
                const itemsToReturn = inventory
                    .filter(item => counts[item.product.id] && parseInt(counts[item.product.id], 10) > 0)
                    .map(item => ({
                        productId: item.product.id,
                        quantity: parseInt(counts[item.product.id], 10),
                    }));

                if (itemsToReturn.length === 0) {
                    Alert.alert('Info', 'Entre les quantités à retourner.');
                    setSubmitting(false);
                    return;
                }

                await api.post('/api/inventory/transfer', { userId, items: itemsToReturn });
                Alert.alert('✅ Retour effectué', 'Le stock a été retourné à l\'entrepôt.');
                fetchConsumables();
                setCounts({});
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Erreur', consumableMode === 'AUDIT'
                ? 'Impossible de soumettre l\'audit'
                : 'Impossible de retourner le stock'
            );
        } finally {
            setSubmitting(false);
        }
    };

    // Audit stats
    const totalItems = inventory.length;
    const filledItems = inventory.filter(item => counts[item.product.id] !== '').length;
    const discrepancies = inventory.filter(item => {
        const entered = parseInt(counts[item.product.id] ?? '', 10);
        return !isNaN(entered) && entered !== item.quantity;
    }).length;
    const progress = totalItems > 0 ? filledItems / totalItems : 0;

    const getDiffStatus = (item: InventoryItem) => {
        const val = counts[item.product.id];
        if (val === '' || val === undefined) return 'untouched';
        const entered = parseInt(val, 10);
        if (isNaN(entered)) return 'untouched';
        if (entered === item.quantity) return 'ok';
        if (entered < item.quantity) return 'low';
        return 'high';
    };

    // ─── EQUIPMENT API ────────────────────────────────────────────────────────
    const fetchEquipment = async () => {
        setLoadingEquipment(true);
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) { Alert.alert('Erreur', 'Utilisateur introuvable'); return; }

            const res = await api.get(`/api/inventory/equipment?userId=${userId}`);
            setAssignedEquipment(res.data.assigned || []);
            setAllEquipment(res.data.allEquipment || []);
        } catch (error) {
            console.error(error);
            Alert.alert('Erreur', 'Impossible de charger les équipements');
        } finally {
            setLoadingEquipment(false);
        }
    };

    const handleAddEquipment = async (productId: string) => {
        setActionLoading(productId);
        try {
            const userId = await AsyncStorage.getItem('userId');
            await api.post('/api/inventory/equipment', { userId, productId, quantity: 1 });
            Alert.alert('✅ Ajouté', 'Équipement ajouté à ton véhicule.');
            setShowAddEquipmentModal(false);
            fetchEquipment();
        } catch (error) {
            Alert.alert('Erreur', 'Impossible d\'ajouter l\'équipement');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveEquipment = (item: EquipmentItem) => {
        Alert.alert(
            '⚠️ Retirer l\'équipement',
            `Retirer "${item.product.name}" de ton véhicule?\n\nCet équipement sera marqué comme non-assigné.`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Retirer',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading(item.product.id);
                        try {
                            const userId = await AsyncStorage.getItem('userId');
                            await api.post('/api/inventory/equipment', {
                                userId,
                                productId: item.product.id,
                                action: 'REMOVE'
                            });
                            fetchEquipment();
                        } catch {
                            Alert.alert('Erreur', 'Impossible de retirer l\'équipement');
                        } finally {
                            setActionLoading(null);
                        }
                    }
                }
            ]
        );
    };

    // Equipment not yet in vehicle
    const assignedProductIds = new Set(assignedEquipment.map(e => e.product.id));
    const availableToAdd = allEquipment.filter(e => !assignedProductIds.has(e.id));

    // ─── RENDER ───────────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            {/* ── Main Tab Selector ─────────────────────────────────────────── */}
            <View style={styles.mainTabBar}>
                <TouchableOpacity
                    style={[styles.mainTab, mainTab === 'CONSUMABLES' && styles.mainTabActive]}
                    onPress={() => setMainTab('CONSUMABLES')}
                >
                    <Text style={styles.mainTabEmoji}>🧪</Text>
                    <Text style={[styles.mainTabLabel, mainTab === 'CONSUMABLES' && styles.mainTabLabelActive]}>
                        Consommables
                    </Text>
                    <Text style={[styles.mainTabSub, mainTab === 'CONSUMABLES' && styles.mainTabSubActive]}>
                        Inventaire véhicule
                    </Text>
                </TouchableOpacity>

                <View style={styles.mainTabDivider} />

                <TouchableOpacity
                    style={[styles.mainTab, mainTab === 'EQUIPMENT' && styles.mainTabEquipActive]}
                    onPress={() => setMainTab('EQUIPMENT')}
                >
                    <Text style={styles.mainTabEmoji}>🔧</Text>
                    <Text style={[styles.mainTabLabel, mainTab === 'EQUIPMENT' && styles.mainTabLabelEquipActive]}>
                        Équipements & Outils
                    </Text>
                    <Text style={[styles.mainTabSub, mainTab === 'EQUIPMENT' && styles.mainTabSubEquipActive]}>
                        Actifs assignés
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* CONSOMMABLES TAB                                               */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {mainTab === 'CONSUMABLES' && (
                loadingConsumables ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#2563eb" />
                        <Text style={styles.loadingText}>Chargement consommables...</Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.content}>
                        {/* Banner */}
                        <View style={styles.consumableBanner}>
                            <Text style={styles.bannerTitle}>🧪 Consommables</Text>
                            <Text style={styles.bannerDesc}>
                                Produits utilisables : pesticides, produits de traitement.{'\n'}
                                Audit hebdomadaire requis.
                            </Text>
                        </View>

                        {/* Sub-mode toggle */}
                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, consumableMode === 'AUDIT' && styles.toggleBtnActive]}
                                onPress={() => setConsumableMode('AUDIT')}
                            >
                                <Text style={[styles.toggleText, consumableMode === 'AUDIT' && styles.toggleTextActive]}>
                                    📋 Audit hebdo
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleBtn, consumableMode === 'RETURN' && styles.toggleBtnActive]}
                                onPress={() => setConsumableMode('RETURN')}
                            >
                                <Text style={[styles.toggleText, consumableMode === 'RETURN' && styles.toggleTextActive]}>
                                    📦 Retour stock
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Progress bar (AUDIT only) */}
                        {consumableMode === 'AUDIT' && (
                            <View style={styles.progressCard}>
                                <View style={styles.progressHeader}>
                                    <Text style={styles.progressLabel}>
                                        {filledItems}/{totalItems} vérifiés
                                    </Text>
                                    {discrepancies > 0 && (
                                        <Text style={styles.discrepancyBadge}>
                                            ⚠️ {discrepancies} écart{discrepancies > 1 ? 's' : ''}
                                        </Text>
                                    )}
                                    {filledItems === totalItems && discrepancies === 0 && totalItems > 0 && (
                                        <Text style={styles.allOkBadge}>✅ Tout OK</Text>
                                    )}
                                </View>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
                                </View>
                                {totalItems > 0 && (
                                    <TouchableOpacity style={styles.confirmAllBtn} onPress={confirmAll}>
                                        <Text style={styles.confirmAllText}>✓ Tout confirmer tel quel</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        <Text style={styles.headerText}>
                            {consumableMode === 'AUDIT'
                                ? 'Vérifie tes niveaux de stock et signale les écarts.'
                                : 'Entre la quantité à retourner à l\'entrepôt.'}
                        </Text>

                        {/* Inventory list */}
                        {inventory.length === 0 ? (
                            <View style={styles.emptyStateBox}>
                                <Text style={styles.emptyStateIcon}>📭</Text>
                                <Text style={styles.emptyStateTitle}>Aucun consommable</Text>
                                <Text style={styles.emptyStateDesc}>
                                    Aucun consommable n'est assigné à ton véhicule.{'\n'}
                                    Demande à l'admin de t'en assigner.
                                </Text>
                            </View>
                        ) : (
                            inventory.map((item) => {
                                const diffStatus = getDiffStatus(item);
                                const rowBg =
                                    diffStatus === 'ok' ? '#f0fdf4' :
                                    diffStatus === 'low' ? '#fef2f2' :
                                    diffStatus === 'high' ? '#fffbeb' : 'white';
                                const borderColor =
                                    diffStatus === 'ok' ? '#bbf7d0' :
                                    diffStatus === 'low' ? '#fecaca' :
                                    diffStatus === 'high' ? '#fde68a' : '#f3f4f6';

                                return (
                                    <View key={item.id} style={[styles.row, { backgroundColor: rowBg, borderColor }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.productName}>{item.product.name}</Text>
                                            <Text style={styles.unit}>{item.product.unit}</Text>
                                            {diffStatus === 'low' && (
                                                <Text style={styles.diffBadgeLow}>
                                                    ▼ Manque {item.quantity - parseInt(counts[item.product.id] || '0', 10)} unité(s)
                                                </Text>
                                            )}
                                            {diffStatus === 'high' && (
                                                <Text style={styles.diffBadgeHigh}>
                                                    ▲ Surplus de {parseInt(counts[item.product.id] || '0', 10) - item.quantity} unité(s)
                                                </Text>
                                            )}
                                            {diffStatus === 'ok' && (
                                                <Text style={styles.diffBadgeOk}>✓ Correspond</Text>
                                            )}
                                        </View>

                                        <View style={styles.counts}>
                                            <View style={styles.countBlock}>
                                                <Text style={styles.countLabel}>Attendu</Text>
                                                <Text style={styles.expectedValue}>{item.quantity}</Text>
                                            </View>

                                            <View style={styles.countBlock}>
                                                <Text style={[styles.countLabel, consumableMode === 'RETURN' && { color: '#dc2626' }]}>
                                                    {consumableMode === 'AUDIT' ? 'Réel' : 'Retour'}
                                                </Text>
                                                <View style={styles.qtyRow}>
                                                    <TouchableOpacity
                                                        style={styles.qtyMiniBtn}
                                                        onPress={() => {
                                                            const cur = parseInt(counts[item.product.id] || '0', 10);
                                                            if (cur > 0) handleCountChange(item.product.id, (cur - 1).toString());
                                                        }}
                                                    >
                                                        <Text style={styles.qtyMiniBtnText}>−</Text>
                                                    </TouchableOpacity>
                                                    <TextInput
                                                        style={[
                                                            styles.input,
                                                            consumableMode === 'RETURN' && styles.inputReturn,
                                                            diffStatus === 'ok' && styles.inputOk,
                                                            diffStatus === 'low' && styles.inputLow,
                                                        ]}
                                                        keyboardType="numeric"
                                                        value={counts[item.product.id] ?? ''}
                                                        onChangeText={(text) => handleCountChange(item.product.id, text)}
                                                        placeholder={consumableMode === 'AUDIT' ? item.quantity.toString() : '0'}
                                                    />
                                                    <TouchableOpacity
                                                        style={styles.qtyMiniBtn}
                                                        onPress={() => {
                                                            const cur = parseInt(counts[item.product.id] || '0', 10);
                                                            handleCountChange(item.product.id, (cur + 1).toString());
                                                        }}
                                                    >
                                                        <Text style={styles.qtyMiniBtnText}>+</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )}

                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                submitting && { opacity: 0.7 },
                                consumableMode === 'RETURN' && { backgroundColor: '#dc2626' },
                            ]}
                            onPress={submitConsumableAction}
                            disabled={submitting}
                        >
                            <Text style={styles.submitButtonText}>
                                {submitting
                                    ? 'Traitement...'
                                    : consumableMode === 'AUDIT'
                                        ? '📋 Soumettre l\'audit'
                                        : '📦 Retourner à l\'entrepôt'
                                }
                            </Text>
                        </TouchableOpacity>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                )
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* ÉQUIPEMENTS & OUTILS TAB                                       */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {mainTab === 'EQUIPMENT' && (
                loadingEquipment ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#7c3aed" />
                        <Text style={styles.loadingText}>Chargement équipements...</Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.content}>
                        {/* Banner */}
                        <View style={styles.equipmentBanner}>
                            <Text style={styles.equipBannerTitle}>🔧 Équipements & Outils</Text>
                            <Text style={styles.equipBannerDesc}>
                                Appareils et outils durables assignés à ton véhicule.{'\n'}
                                Ces items NE se consomment PAS — ils restent trackés.
                            </Text>
                        </View>

                        {/* My vehicle equipment */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>🚐 Dans mon véhicule</Text>
                            <Text style={styles.sectionCount}>{assignedEquipment.length} item{assignedEquipment.length !== 1 ? 's' : ''}</Text>
                        </View>

                        {assignedEquipment.length === 0 ? (
                            <View style={styles.emptyStateBox}>
                                <Text style={styles.emptyStateIcon}>🚐</Text>
                                <Text style={styles.emptyStateTitle}>Aucun équipement assigné</Text>
                                <Text style={styles.emptyStateDesc}>
                                    Tu n'as aucun équipement dans ton véhicule.{'\n'}
                                    Utilise le bouton ci-dessous pour en ajouter.
                                </Text>
                            </View>
                        ) : (
                            assignedEquipment.map((item) => (
                                <View key={item.id} style={styles.equipRow}>
                                    <View style={styles.equipIconBox}>
                                        <Text style={styles.equipIcon}>🔧</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.equipName}>{item.product.name}</Text>
                                        {item.product.description ? (
                                            <Text style={styles.equipDesc} numberOfLines={1}>
                                                {item.product.description}
                                            </Text>
                                        ) : null}
                                        <View style={styles.equipMeta}>
                                            <View style={styles.equipQtyBadge}>
                                                <Text style={styles.equipQtyText}>
                                                    Qté : {item.quantity} {item.product.unit}
                                                </Text>
                                            </View>
                                            <View style={styles.equipAssignedBadge}>
                                                <Text style={styles.equipAssignedText}>✓ Dans mon véhicule</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.removeBtn}
                                        onPress={() => handleRemoveEquipment(item)}
                                        disabled={actionLoading === item.product.id}
                                    >
                                        {actionLoading === item.product.id
                                            ? <ActivityIndicator size="small" color="#dc2626" />
                                            : <Text style={styles.removeBtnText}>✕</Text>
                                        }
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}

                        {/* Add equipment button */}
                        <TouchableOpacity
                            style={styles.addEquipmentBtn}
                            onPress={() => setShowAddEquipmentModal(true)}
                        >
                            <Text style={styles.addEquipmentBtnText}>+ Ajouter équipement à mon véhicule</Text>
                        </TouchableOpacity>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                )
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* ADD EQUIPMENT MODAL                                            */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <Modal
                visible={showAddEquipmentModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowAddEquipmentModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>🔧 Ajouter équipement</Text>
                        <TouchableOpacity onPress={() => setShowAddEquipmentModal(false)}>
                            <Text style={styles.modalClose}>✕ Fermer</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.modalSubtitle}>
                        Sélectionne l'équipement à ajouter à ton inventaire véhicule.
                    </Text>

                    {availableToAdd.length === 0 ? (
                        <View style={styles.centered}>
                            <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
                            <Text style={{ fontWeight: '700', color: '#1f2937', fontSize: 16 }}>
                                Tout est déjà dans ton véhicule !
                            </Text>
                            <Text style={{ color: '#6b7280', marginTop: 6, textAlign: 'center' }}>
                                Tu possèdes déjà tous les équipements disponibles.
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={availableToAdd}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: 16 }}
                            renderItem={({ item }) => (
                                <View style={styles.modalEquipRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.modalEquipName}>{item.name}</Text>
                                        {item.description ? (
                                            <Text style={styles.modalEquipDesc} numberOfLines={2}>
                                                {item.description}
                                            </Text>
                                        ) : null}
                                        <Text style={styles.modalEquipUnit}>{item.unit}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[
                                            styles.claimBtn,
                                            actionLoading === item.id && { opacity: 0.6 }
                                        ]}
                                        onPress={() => handleAddEquipment(item.id)}
                                        disabled={actionLoading === item.id}
                                    >
                                        {actionLoading === item.id
                                            ? <ActivityIndicator size="small" color="white" />
                                            : <Text style={styles.claimBtnText}>+ Ajouter</Text>
                                        }
                                    </TouchableOpacity>
                                </View>
                            )}
                            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                        />
                    )}
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    content: { padding: 16 },
    loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },

    // ── Main Tab Bar
    mainTabBar: {
        flexDirection: 'row',
        backgroundColor: '#1f2937',
        paddingVertical: 0,
    },
    mainTab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
    },
    mainTabActive: {
        backgroundColor: '#1e3a8a',
        borderBottomWidth: 3,
        borderBottomColor: '#3b82f6',
    },
    mainTabEquipActive: {
        backgroundColor: '#4c1d95',
        borderBottomWidth: 3,
        borderBottomColor: '#7c3aed',
    },
    mainTabDivider: {
        width: 1,
        backgroundColor: '#374151',
        marginVertical: 8,
    },
    mainTabEmoji: { fontSize: 20, marginBottom: 2 },
    mainTabLabel: { 
        fontSize: 13, fontWeight: '700', color: '#9ca3af', textAlign: 'center' 
    },
    mainTabLabelActive: { color: '#93c5fd' },
    mainTabLabelEquipActive: { color: '#c4b5fd' },
    mainTabSub: { 
        fontSize: 10, color: '#6b7280', marginTop: 1, textAlign: 'center'
    },
    mainTabSubActive: { color: '#60a5fa' },
    mainTabSubEquipActive: { color: '#a78bfa' },

    // ── Consumable Banner
    consumableBanner: {
        backgroundColor: '#eff6ff',
        borderWidth: 1.5,
        borderColor: '#bfdbfe',
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
    },
    bannerTitle: { fontSize: 15, fontWeight: '800', color: '#1e40af', marginBottom: 4 },
    bannerDesc: { fontSize: 12, color: '#3b82f6', lineHeight: 18 },

    // ── Equipment Banner
    equipmentBanner: {
        backgroundColor: '#f5f3ff',
        borderWidth: 1.5,
        borderColor: '#ddd6fe',
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
    },
    equipBannerTitle: { fontSize: 15, fontWeight: '800', color: '#5b21b6', marginBottom: 4 },
    equipBannerDesc: { fontSize: 12, color: '#7c3aed', lineHeight: 18 },

    // ── Section header
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
    sectionCount: {
        fontSize: 12, color: '#6b7280', backgroundColor: '#e5e7eb',
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    },

    // ── Empty states
    emptyStateBox: {
        backgroundColor: 'white', borderRadius: 14, padding: 28,
        alignItems: 'center', marginBottom: 16,
        borderWidth: 1, borderColor: '#e5e7eb',
    },
    emptyStateIcon: { fontSize: 36, marginBottom: 10 },
    emptyStateTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 6 },
    emptyStateDesc: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 19 },

    // ── Equipment rows
    equipRow: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#ede9fe',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    equipIconBox: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#f5f3ff',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },
    equipIcon: { fontSize: 18 },
    equipName: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 2 },
    equipDesc: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
    equipMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    equipQtyBadge: {
        backgroundColor: '#f5f3ff', paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 8,
    },
    equipQtyText: { fontSize: 11, color: '#7c3aed', fontWeight: '600' },
    equipAssignedBadge: {
        backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 8,
    },
    equipAssignedText: { fontSize: 11, color: '#16a34a', fontWeight: '600' },
    removeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#fef2f2',
        alignItems: 'center', justifyContent: 'center',
        marginLeft: 10,
    },
    removeBtnText: { color: '#dc2626', fontSize: 14, fontWeight: 'bold' },

    // ── Add equipment button
    addEquipmentBtn: {
        marginTop: 8,
        backgroundColor: '#7c3aed',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    addEquipmentBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

    // ── Consumables Toggle
    toggleContainer: {
        flexDirection: 'row', backgroundColor: '#e5e7eb',
        borderRadius: 12, padding: 4, marginBottom: 16,
    },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    toggleBtnActive: {
        backgroundColor: 'white',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1, shadowRadius: 1, elevation: 1,
    },
    toggleText: { fontWeight: '600', color: '#6b7280' },
    toggleTextActive: { color: '#1f2937' },

    // ── Progress bar
    progressCard: {
        backgroundColor: 'white', borderRadius: 12,
        padding: 14, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
    },
    progressHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 10,
    },
    progressLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
    discrepancyBadge: {
        backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 8, fontSize: 12, color: '#dc2626', fontWeight: '700',
    },
    allOkBadge: {
        backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 8, fontSize: 12, color: '#16a34a', fontWeight: '700',
    },
    progressBar: {
        height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden',
    },
    progressFill: {
        height: '100%' as any, backgroundColor: '#2563eb', borderRadius: 3,
    },
    confirmAllBtn: {
        marginTop: 10, alignSelf: 'flex-end',
        backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    },
    confirmAllText: { fontSize: 13, color: '#4b5563', fontWeight: '600' },

    headerText: {
        fontSize: 13, color: '#666', marginBottom: 14,
        textAlign: 'center', fontStyle: 'italic',
    },

    // ── Consumable rows
    row: {
        borderRadius: 12, padding: 14, marginBottom: 10,
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
    },
    productName: { fontSize: 15, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 },
    unit: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
    diffBadgeLow: { fontSize: 11, color: '#dc2626', fontWeight: '600', marginTop: 4 },
    diffBadgeHigh: { fontSize: 11, color: '#d97706', fontWeight: '600', marginTop: 4 },
    diffBadgeOk: { fontSize: 11, color: '#16a34a', fontWeight: '600', marginTop: 4 },

    counts: { flexDirection: 'row', gap: 12 },
    countBlock: { alignItems: 'center' },
    countLabel: {
        fontSize: 9, color: '#9ca3af', marginBottom: 4,
        textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5,
    },
    expectedValue: { fontSize: 18, fontWeight: '600', color: '#6b7280', paddingVertical: 8 },

    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    qtyMiniBtn: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center',
    },
    qtyMiniBtnText: { fontSize: 14, fontWeight: 'bold', color: '#374151' },

    input: {
        backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#bfdbfe',
        borderRadius: 8, textAlign: 'center', width: 52,
        paddingVertical: 7, fontSize: 17, fontWeight: 'bold', color: '#1e40af',
    },
    inputReturn: { backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' },
    inputOk: { backgroundColor: '#f0fdf4', borderColor: '#86efac', color: '#16a34a' },
    inputLow: { backgroundColor: '#fef2f2', borderColor: '#fc8181', color: '#dc2626' },

    submitButton: {
        marginTop: 20, backgroundColor: '#2563eb',
        padding: 16, borderRadius: 12, alignItems: 'center',
        shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    submitButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },

    // ── Add Equipment Modal
    modalContainer: { flex: 1, backgroundColor: '#f9fafb' },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20,
        backgroundColor: 'white',
        borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1f2937' },
    modalClose: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
    modalSubtitle: {
        fontSize: 13, color: '#6b7280', paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#f5f3ff', borderBottomWidth: 1, borderBottomColor: '#ede9fe',
    },
    modalEquipRow: {
        backgroundColor: 'white', borderRadius: 12, padding: 14,
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#ede9fe',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
    },
    modalEquipName: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 3 },
    modalEquipDesc: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
    modalEquipUnit: {
        fontSize: 11, color: '#7c3aed', fontWeight: '600',
        textTransform: 'uppercase', letterSpacing: 0.5,
    },
    claimBtn: {
        backgroundColor: '#7c3aed',
        paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 10, minWidth: 80, alignItems: 'center',
    },
    claimBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
});
