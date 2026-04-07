import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LucideSearch, LucidePlus, LucideX } from 'lucide-react-native';
import api from '../services/api'; // ✅ Utilise API_URL de config.ts — plus d'IP hardcodée
import { ClientSearchResult } from '../lib/schemas';

export default function CreateQuoteScreen({ navigation }: any) {
    // ─── Client Search ─────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ClientSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Products ──────────────────────────────────────────────────
    const [products, setProducts] = useState<any[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const res = await api.get('/api/products');
            setProducts(res.data);
        } catch (error) {
            console.error('Impossible de charger les produits', error);
        }
    };

    // ─── Live Client Search avec debounce ────────────────────────
    const handleClientSearch = (text: string) => {
        setSearchQuery(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (text.length < 2) {
            setSearchResults([]);
            return;
        }
        searchTimeout.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await api.get(`/api/clients?search=${encodeURIComponent(text)}&limit=20`);
                setSearchResults(res.data);
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 350);
    };

    const filteredProducts = productSearch
        ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
        : products;

    const addItem = (product: any) => {
        const existing = selectedItems.find(i => i.id === product.id);
        if (existing) {
            setSelectedItems(selectedItems.map(i =>
                i.id === product.id ? { ...i, qty: i.qty + 1 } : i
            ));
        } else {
            setSelectedItems([...selectedItems, { ...product, qty: 1 }]);
        }
        setIsProductModalOpen(false);
    };

    const removeItem = (id: string) => {
        setSelectedItems(selectedItems.filter(i => i.id !== id));
    };

    const updateQty = (id: string, delta: number) => {
        setSelectedItems(prev => prev
            .map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
        );
    };

    const calculateTotal = () =>
        selectedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const submitQuote = async () => {
        if (!selectedClient) {
            Alert.alert('Info manquante', 'Sélectionne un client.');
            return;
        }
        if (selectedItems.length === 0) {
            Alert.alert('Info manquante', 'Ajoute au moins un article.');
            return;
        }

        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem('userId');

            await api.post('/api/quotes', {
                clientId: selectedClient.id,
                items: selectedItems.map(i => ({
                    productId: i.id,
                    quantity: i.qty,
                    price: i.price,
                })),
                salesRepId: userId,
            });

            Alert.alert('✅ Soumission créée!', 'La soumission a été envoyée au client.');
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Erreur', 'Impossible de créer la soumission.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>

                {/* ── Client ─────────────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.label}>Client</Text>
                    {selectedClient ? (
                        <View style={styles.selectedClientBox}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.selectedClientName}>{selectedClient.name}</Text>
                                {selectedClient.phone && (
                                    <Text style={styles.selectedClientSub}>📱 {selectedClient.phone}</Text>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => setSelectedClient(null)}>
                                <LucideX size={20} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.selector}
                            onPress={() => setIsClientModalOpen(true)}
                        >
                            <Text style={styles.selectorText}>Rechercher un client...</Text>
                            <LucideSearch size={20} color="#666" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Items / Services ───────────────────────────── */}
                <View style={[styles.section, { flex: 1 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.label}>Articles / Services</Text>
                        <TouchableOpacity
                            style={styles.addItemBtn}
                            onPress={() => setIsProductModalOpen(true)}
                        >
                            <LucidePlus size={14} color="white" />
                            <Text style={styles.addItemBtnText}>Ajouter</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.itemList}>
                        {selectedItems.length === 0 ? (
                            <Text style={styles.emptyItems}>Aucun article ajouté.</Text>
                        ) : (
                            selectedItems.map((item, idx) => (
                                <View key={idx} style={styles.itemRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <Text style={styles.itemPrice}>${item.price.toFixed(2)} / {item.unit}</Text>
                                    </View>
                                    <View style={styles.qtyControl}>
                                        <TouchableOpacity
                                            style={styles.qtyBtn}
                                            onPress={() => updateQty(item.id, -1)}
                                        >
                                            <Text style={styles.qtyBtnText}>−</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.qtyValue}>{item.qty}</Text>
                                        <TouchableOpacity
                                            style={styles.qtyBtn}
                                            onPress={() => updateQty(item.id, 1)}
                                        >
                                            <Text style={styles.qtyBtnText}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => removeItem(item.id)}
                                        style={{ marginLeft: 8 }}
                                    >
                                        <LucideX size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                {/* ── Footer ─────────────────────────────────────── */}
                <View style={styles.footer}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total estimé:</Text>
                        <Text style={styles.totalValue}>${calculateTotal().toFixed(2)}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.submitButton, loading && { opacity: 0.7 }]}
                        onPress={submitQuote}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.submitButtonText}>🚀 Créer et envoyer la soumission</Text>
                        }
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* ── Modal Recherche Client ───────────────────────── */}
            <Modal visible={isClientModalOpen} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>🔍 Sélectionner un client</Text>
                        <TouchableOpacity onPress={() => setIsClientModalOpen(false)}>
                            <Text style={styles.modalClose}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Nom, téléphone ou email..."
                        value={searchQuery}
                        onChangeText={handleClientSearch}
                        autoFocus
                    />
                    {searching && <ActivityIndicator style={{ marginTop: 12 }} color="#2563eb" />}
                    <ScrollView keyboardShouldPersistTaps="handled">
                        {searchResults.map(client => (
                            <TouchableOpacity
                                key={client.id}
                                style={styles.listItem}
                                onPress={() => {
                                    setSelectedClient(client);
                                    setIsClientModalOpen(false);
                                    setSearchQuery('');
                                    setSearchResults([]);
                                }}
                            >
                                <Text style={styles.listItemTitle}>{client.name}</Text>
                                {client.phone && (
                                    <Text style={styles.listItemSubtitle}>📱 {client.phone}</Text>
                                )}
                                {client.properties?.[0] && (
                                    <Text style={styles.listItemSubtitle}>📍 {client.properties[0].address}</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                        {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                            <Text style={{ textAlign: 'center', color: '#999', paddingTop: 30 }}>
                                Aucun client trouvé.
                            </Text>
                        )}
                    </ScrollView>
                </View>
            </Modal>

            {/* ── Modal Produits ─────────────────────────────── */}
            <Modal visible={isProductModalOpen} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Ajouter un article</Text>
                        <TouchableOpacity onPress={() => setIsProductModalOpen(false)}>
                            <Text style={styles.modalClose}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher..."
                        value={productSearch}
                        onChangeText={setProductSearch}
                    />
                    <ScrollView keyboardShouldPersistTaps="handled">
                        {filteredProducts.map(product => (
                            <TouchableOpacity
                                key={product.id}
                                style={styles.listItem}
                                onPress={() => addItem(product)}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.listItemTitle}>{product.name}</Text>
                                    <Text style={styles.listItemSubtitle}>
                                        ${product.price?.toFixed(2)} / {product.unit}
                                    </Text>
                                </View>
                                <LucidePlus size={20} color="#2563eb" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    section: { marginBottom: 16 },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 8,
    },
    label: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
    selector: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#fff', padding: 14, borderRadius: 10,
        borderWidth: 1, borderColor: '#ddd',
    },
    selectorText: { fontSize: 16, color: '#9ca3af' },

    selectedClientBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f0fdf4', padding: 14, borderRadius: 10,
        borderWidth: 1, borderColor: '#bbf7d0',
    },
    selectedClientName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
    selectedClientSub: { fontSize: 14, color: '#4b5563', marginTop: 2 },

    addItemBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#2563eb', paddingHorizontal: 12,
        paddingVertical: 6, borderRadius: 8,
    },
    addItemBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },

    itemList: {
        backgroundColor: '#fff', borderRadius: 10,
        padding: 10, minHeight: 120,
        borderWidth: 1, borderColor: '#e5e7eb',
    },
    emptyItems: { textAlign: 'center', marginTop: 30, color: '#9ca3af' },
    itemRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
    },
    itemName: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
    itemPrice: { fontSize: 13, color: '#6b7280', marginTop: 2 },

    qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qtyBtn: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
    },
    qtyBtnText: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
    qtyValue: { fontSize: 16, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },

    footer: {
        backgroundColor: '#fff', padding: 16, borderRadius: 14,
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06, shadowRadius: 6, marginTop: 8,
    },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    totalLabel: { fontSize: 17, fontWeight: 'bold', color: '#374151' },
    totalValue: { fontSize: 17, fontWeight: 'bold', color: '#2563eb' },
    submitButton: {
        backgroundColor: '#2563eb', padding: 16, borderRadius: 10,
        alignItems: 'center',
    },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    // Modals
    modal: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 60 },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
    modalClose: { fontSize: 20, color: '#6b7280', padding: 4 },
    searchInput: {
        backgroundColor: '#f3f4f6', padding: 13, borderRadius: 10,
        fontSize: 15, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12,
    },
    listItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
    },
    listItemTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
    listItemSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
});
