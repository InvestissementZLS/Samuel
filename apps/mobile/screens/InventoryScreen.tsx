import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config';
import { useNavigation } from '@react-navigation/native';

export default function InventoryScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<'AUDIT' | 'RETURN'>('AUDIT');
    const [submitting, setSubmitting] = useState(false);
    const [inventory, setInventory] = useState<any[]>([]);

    // Key-Value pair of productId -> actualQuantity (string for input)
    const [counts, setCounts] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                Alert.alert("Error", "User not found");
                return;
            }

            const res = await axios.get(`${API_URL}/api/inventory/audit?userId=${userId}`);

            // Initialize inputs with current quantities
            const initialCounts: any = {};
            res.data.forEach((item: any) => {
                initialCounts[item.product.id] = item.quantity.toString();
            });

            setInventory(res.data);
            setCounts(initialCounts);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to fetch inventory");
        } finally {
            setLoading(false);
        }
    };

    const handleCountChange = (productId: string, text: string) => {
        setCounts(prev => ({
            ...prev,
            [productId]: text
        }));
    };

    const submitAction = async () => {
        setSubmitting(true);
        try {
            const userId = await AsyncStorage.getItem('userId');

            if (mode === 'AUDIT') {
                // ... Audit Logic
                const items = inventory.map(item => ({
                    productId: item.product.id,
                    actualQuantity: parseInt(counts[item.product.id] || "0", 10),
                    notes: ""
                }));
                await axios.post(`${API_URL}/api/inventory/audit`, { userId, items });
                Alert.alert("Success", "Inventory Audit Submitted!");
            } else {
                // ... Return Logic
                // Filter only items with quantity entered
                const itemsToReturn = inventory
                    .filter(item => counts[item.product.id] && parseInt(counts[item.product.id], 10) > 0)
                    .map(item => ({
                        productId: item.product.id,
                        quantity: parseInt(counts[item.product.id], 10)
                    }));

                if (itemsToReturn.length === 0) {
                    Alert.alert("Info", "Enter quantities to return.");
                    setSubmitting(false);
                    return;
                }

                await axios.post(`${API_URL}/api/inventory/transfer`, { userId, items: itemsToReturn });
                Alert.alert("Success", "Stock returned to Warehouse.");
                fetchInventory(); // Refresh after return
                setCounts({});
            }

            if (mode === 'AUDIT') navigation.goBack();

        } catch (error) {
            console.error(error);
            Alert.alert("Error", mode === 'AUDIT' ? "Failed to submit audit" : "Failed to return stock");
        } finally {
            setSubmitting(false);
        }
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
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.content}>

                {/* Mode Toggles */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, mode === 'AUDIT' && styles.toggleBtnActive]}
                        onPress={() => setMode('AUDIT')}
                    >
                        <Text style={[styles.toggleText, mode === 'AUDIT' && styles.toggleTextActive]}>Weekly Audit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, mode === 'RETURN' && styles.toggleBtnActive]}
                        onPress={() => setMode('RETURN')}
                    >
                        <Text style={[styles.toggleText, mode === 'RETURN' && styles.toggleTextActive]}>Return Stock</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.headerText}>
                    {mode === 'AUDIT'
                        ? "Verify your stock levels and report discrepancies."
                        : "Enter quantity to return to Warehouse."}
                </Text>

                {inventory.length === 0 ? (
                    <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>
                        Your inventory is empty.
                    </Text>
                ) : (
                    inventory.map((item) => (
                        <View key={item.id} style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.productName}>{item.product.name}</Text>
                                <Text style={styles.unit}>{item.product.unit}</Text>
                            </View>

                            <View style={styles.counts}>
                                <View style={styles.countBlock}>
                                    <Text style={styles.label}>Current</Text>
                                    <Text style={styles.expectedValue}>{item.quantity}</Text>
                                </View>

                                <View style={styles.countBlock}>
                                    <Text style={[styles.label, mode === 'RETURN' && { color: '#dc2626' }]}>
                                        {mode === 'AUDIT' ? 'Actual' : 'Return'}
                                    </Text>
                                    <TextInput
                                        style={[styles.input, mode === 'RETURN' && styles.inputReturn]}
                                        keyboardType="numeric"
                                        value={counts[item.product.id] || ""} // Default empty for return
                                        onChangeText={(text) => handleCountChange(item.product.id, text)}
                                        placeholder={mode === 'AUDIT' ? item.quantity.toString() : "0"}
                                    />
                                </View>
                            </View>
                        </View>
                    ))
                )}

                <TouchableOpacity
                    style={[styles.submitButton, submitting && { opacity: 0.7 }, mode === 'RETURN' && { backgroundColor: '#dc2626' }]}
                    onPress={submitAction}
                    disabled={submitting}
                >
                    <Text style={styles.submitButtonText}>
                        {submitting ? "Processing..." : (mode === 'AUDIT' ? "Submit Report" : "Return to Warehouse")}
                    </Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
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
        padding: 16,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#e5e7eb',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    toggleBtnActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    toggleText: {
        fontWeight: '600',
        color: '#6b7280'
    },
    toggleTextActive: {
        color: '#1f2937'
    },
    headerText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center'
    },
    row: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4
    },
    unit: {
        fontSize: 12,
        color: '#6b7280',
        textTransform: 'uppercase'
    },
    counts: {
        flexDirection: 'row',
        gap: 16
    },
    countBlock: {
        alignItems: 'center'
    },
    label: {
        fontSize: 10,
        color: '#9ca3af',
        marginBottom: 4,
        textTransform: 'uppercase',
        fontWeight: '600'
    },
    expectedValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6b7280',
        paddingVertical: 8
    },
    input: {
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        borderRadius: 8,
        textAlign: 'center',
        width: 60,
        paddingVertical: 8,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e40af'
    },
    inputReturn: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
        color: '#dc2626'
    },
    submitButton: {
        marginTop: 20,
        backgroundColor: '#2563eb',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold'
    }
});
