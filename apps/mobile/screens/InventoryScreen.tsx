import React, { useEffect, useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api'; // ✅ API centralisée
import { InventoryItem } from '../lib/schemas';

export default function InventoryScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<'AUDIT' | 'RETURN'>('AUDIT');
    const [submitting, setSubmitting] = useState(false);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [counts, setCounts] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) { Alert.alert('Erreur', 'Utilisateur introuvable'); return; }

            const res = await api.get(`/api/inventory/audit?userId=${userId}`);

            const initialCounts: { [key: string]: string } = {};
            res.data.forEach((item: InventoryItem) => {
                initialCounts[item.product.id] = item.quantity.toString();
            });

            setInventory(res.data);
            setCounts(initialCounts);
        } catch (error) {
            console.error(error);
            Alert.alert('Erreur', 'Impossible de charger l\'inventaire');
        } finally {
            setLoading(false);
        }
    };

    const handleCountChange = (productId: string, text: string) => {
        setCounts(prev => ({ ...prev, [productId]: text }));
    };

    // "Tout confirmer" — pré-remplit avec les quantités actuelles
    const confirmAll = () => {
        const confirmed: { [key: string]: string } = {};
        inventory.forEach(item => {
            confirmed[item.product.id] = item.quantity.toString();
        });
        setCounts(confirmed);
    };

    const submitAction = async () => {
        setSubmitting(true);
        try {
            const userId = await AsyncStorage.getItem('userId');

            if (mode === 'AUDIT') {
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
                fetchInventory();
                setCounts({});
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Erreur', mode === 'AUDIT'
                ? 'Impossible de soumettre l\'audit'
                : 'Impossible de retourner le stock'
            );
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Calculer l'état de l'audit ─────────────────────────────
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

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.content}>

                {/* ── Mode Toggle ─────────────────────────────── */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, mode === 'AUDIT' && styles.toggleBtnActive]}
                        onPress={() => setMode('AUDIT')}
                    >
                        <Text style={[styles.toggleText, mode === 'AUDIT' && styles.toggleTextActive]}>
                            📋 Audit hebdo
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, mode === 'RETURN' && styles.toggleBtnActive]}
                        onPress={() => setMode('RETURN')}
                    >
                        <Text style={[styles.toggleText, mode === 'RETURN' && styles.toggleTextActive]}>
                            📦 Retour stock
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* ── Barre de progression (mode AUDIT seulement) ── */}
                {mode === 'AUDIT' && (
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
                            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                        </View>
                        {totalItems > 0 && (
                            <TouchableOpacity style={styles.confirmAllBtn} onPress={confirmAll}>
                                <Text style={styles.confirmAllText}>✓ Tout confirmer tel quel</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <Text style={styles.headerText}>
                    {mode === 'AUDIT'
                        ? 'Vérifie tes niveaux de stock et signale les écarts.'
                        : 'Entre la quantité à retourner à l\'entrepôt.'}
                </Text>

                {/* ── Liste inventaire ────────────────────────── */}
                {inventory.length === 0 ? (
                    <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>
                        Ton inventaire est vide.
                    </Text>
                ) : (
                    inventory.map((item) => {
                        const diffStatus = getDiffStatus(item);
                        const rowBg =
                            diffStatus === 'ok' ? '#f0fdf4' :
                            diffStatus === 'low' ? '#fef2f2' :
                            diffStatus === 'high' ? '#fffbeb' :
                            'white';
                        const borderColor =
                            diffStatus === 'ok' ? '#bbf7d0' :
                            diffStatus === 'low' ? '#fecaca' :
                            diffStatus === 'high' ? '#fde68a' :
                            '#f3f4f6';

                        return (
                            <View key={item.id} style={[styles.row, { backgroundColor: rowBg, borderColor }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.productName}>{item.product.name}</Text>
                                    <Text style={styles.unit}>{item.product.unit}</Text>
                                    {/* Indicateur d'écart */}
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
                                        <Text style={[styles.countLabel, mode === 'RETURN' && { color: '#dc2626' }]}>
                                            {mode === 'AUDIT' ? 'Réel' : 'Retour'}
                                        </Text>
                                        {/* ─ Boutons +/- pour facilité ─ */}
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
                                                    mode === 'RETURN' && styles.inputReturn,
                                                    diffStatus === 'ok' && styles.inputOk,
                                                    diffStatus === 'low' && styles.inputLow,
                                                ]}
                                                keyboardType="numeric"
                                                value={counts[item.product.id] ?? ''}
                                                onChangeText={(text) => handleCountChange(item.product.id, text)}
                                                placeholder={mode === 'AUDIT' ? item.quantity.toString() : '0'}
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
                        mode === 'RETURN' && { backgroundColor: '#dc2626' },
                    ]}
                    onPress={submitAction}
                    disabled={submitting}
                >
                    <Text style={styles.submitButtonText}>
                        {submitting
                            ? 'Traitement...'
                            : mode === 'AUDIT'
                                ? '📋 Soumettre l\'audit'
                                : '📦 Retourner à l\'entrepôt'
                        }
                    </Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16 },

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
        height: '100%', backgroundColor: '#2563eb', borderRadius: 3,
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
});
