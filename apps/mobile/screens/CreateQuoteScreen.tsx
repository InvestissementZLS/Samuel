import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LucideSearch, LucidePlus, LucideX, LucideShoppingCart } from 'lucide-react-native';

const API_URL = 'http://192.168.10.123:3000'; // Make sure this matches your environment

export default function CreateQuoteScreen({ navigation }: any) {
    const [clients, setClients] = useState<any[]>([]);
    const [filteredClients, setFilteredClients] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClient, setSelectedClient] = useState<any | null>(null);

    const [products, setProducts] = useState<any[]>([]);
    const [selectedItems, setSelectedItems] = useState<any[]>([]);

    // Modal states
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            // Fetch Clients (simplified endpoint needed or filter existing)
            const clientsRes = await axios.get(`${API_URL}/api/clients`, { headers: { Authorization: `Bearer ${token}` } });
            setClients(clientsRes.data);
            setFilteredClients(clientsRes.data);

            // Fetch Products
            const prodRes = await axios.get(`${API_URL}/api/products`); // Public or auth? Assuming open or add token
            setProducts(prodRes.data);
        } catch (error) {
            console.error("Failed to load data", error);
            Alert.alert("Error", "Could not load clients/products");
        }
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (text) {
            const lower = text.toLowerCase();
            setFilteredClients(clients.filter(c => c.name.toLowerCase().includes(lower) || c.email?.toLowerCase().includes(lower)));
        } else {
            setFilteredClients(clients);
        }
    };

    const addItem = (product: any) => {
        const existing = selectedItems.find(i => i.id === product.id);
        if (existing) {
            setSelectedItems(selectedItems.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
        } else {
            setSelectedItems([...selectedItems, { ...product, qty: 1 }]);
        }
        setIsProductModalOpen(false);
    };

    const removeItem = (id: string) => {
        setSelectedItems(selectedItems.filter(i => i.id !== id));
    };

    const calculateTotal = () => {
        return selectedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    };

    const submitQuote = async () => {
        if (!selectedClient) {
            Alert.alert("Missing Info", "Please select a client.");
            return;
        }
        if (selectedItems.length === 0) {
            Alert.alert("Missing Info", "Please add at least one item.");
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const userStr = await AsyncStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            await axios.post(`${API_URL}/api/quotes`, {
                clientId: selectedClient.id,
                items: selectedItems.map(i => ({ productId: i.id, quantity: i.qty, price: i.price })),
                salesRepId: user?.id // Vital for commission!
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert("Success", "Quote created and sent!");
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to create quote.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Step 1: Client Selection */}
            <View style={styles.section}>
                <Text style={styles.label}>Client</Text>
                <TouchableOpacity style={styles.selector} onPress={() => setIsClientModalOpen(true)}>
                    <Text style={styles.selectorText}>
                        {selectedClient ? selectedClient.name : "Select Client..."}
                    </Text>
                    <LucideSearch size={20} color="#666" />
                </TouchableOpacity>
            </View>

            {/* Step 2: Items */}
            <View style={[styles.section, { flex: 1 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.label}>Items / Services</Text>
                    <TouchableOpacity onPress={() => setIsProductModalOpen(true)}>
                        <Text style={{ color: '#2563eb', fontWeight: 'bold' }}>+ Add Item</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.itemList}>
                    {selectedItems.length === 0 && (
                        <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>No items added.</Text>
                    )}
                    {selectedItems.map((item, idx) => (
                        <View key={idx} style={styles.itemRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemPrice}>${item.price} x {item.qty}</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeItem(item.id)}>
                                <LucideX size={20} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Footer: Total & Send */}
            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Estimate:</Text>
                    <Text style={styles.totalValue}>${calculateTotal().toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.submitButton, loading && { opacity: 0.7 }]}
                    onPress={submitQuote}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Create & Send Quote 🚀</Text>}
                </TouchableOpacity>
            </View>

            {/* Client Select Modal */}
            <Modal visible={isClientModalOpen} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Client</Text>
                        <TouchableOpacity onPress={() => setIsClientModalOpen(false)}>
                            <Text style={{ color: 'blue' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search clients..."
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    <ScrollView>
                        {filteredClients.map(client => (
                            <TouchableOpacity key={client.id} style={styles.listItem} onPress={() => { setSelectedClient(client); setIsClientModalOpen(false); }}>
                                <Text style={styles.listItemTitle}>{client.name}</Text>
                                <Text style={styles.listItemSubtitle}>{client.address}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>

            {/* Product Select Modal */}
            <Modal visible={isProductModalOpen} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add Product/Service</Text>
                        <TouchableOpacity onPress={() => setIsProductModalOpen(false)}>
                            <Text style={{ color: 'blue' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView>
                        {products.map(product => (
                            <TouchableOpacity key={product.id} style={styles.listItem} onPress={() => addItem(product)}>
                                <View>
                                    <Text style={styles.listItemTitle}>{product.name}</Text>
                                    <Text style={styles.listItemSubtitle}>${product.price} / {product.unit}</Text>
                                </View>
                                <LucidePlus size={20} color="#2563eb" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    section: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
    selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
    selectorText: { fontSize: 16, color: '#333' },
    itemList: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10, minHeight: 200 },
    itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    itemName: { fontSize: 16, fontWeight: '600' },
    itemPrice: { fontSize: 14, color: '#666' },
    footer: { marginTop: 'auto', backgroundColor: '#fff', padding: 16, borderRadius: 12, elevation: 4 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    totalLabel: { fontSize: 18, fontWeight: 'bold' },
    totalValue: { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
    submitButton: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center' },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    modalContainer: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 60 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    searchInput: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginBottom: 16 },
    listItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    listItemTitle: { fontSize: 16, fontWeight: 'bold' },
    listItemSubtitle: { fontSize: 14, color: '#666', marginTop: 4 }
});
