import React, { useState, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, Alert, ActivityIndicator, Modal,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import api from '../services/api';
import { ClientSearchResult, QuickAddJobInput } from '../lib/schemas';
import { addHours, startOfHour } from 'date-fns';

type Nav = StackNavigationProp<RootStackParamList, 'QuickAddJob'>;

export default function QuickAddJobScreen() {
    const navigation = useNavigation<Nav>();

    // ─── Client Search ───────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ClientSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
    const [showClientModal, setShowClientModal] = useState(false);
    const [showPropertyModal, setShowPropertyModal] = useState(false);

    // ─── New Client Form ─────────────────────────────────────
    const [showNewClientForm, setShowNewClientForm] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const [newClientAddress, setNewClientAddress] = useState('');
    const [creatingClient, setCreatingClient] = useState(false);

    // B-05 FIX: Inline address addition for clients with no properties
    const [showAddAddressForm, setShowAddAddressForm] = useState(false);
    const [newAddress, setNewAddress] = useState('');
    const [addingAddress, setAddingAddress] = useState(false);

    // ─── Job Details ─────────────────────────────────────────
    // Default: next full hour
    const nextHour = addHours(startOfHour(new Date()), 1);
    const [scheduledHour, setScheduledHour] = useState(nextHour.getHours());
    const [scheduledMinute, setScheduledMinute] = useState(0);
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // ─── Live Search with Debounce ───────────────────────────
    const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearchChange = (text: string) => {
        setSearchQuery(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (text.length < 2) {
            setSearchResults([]);
            return;
        }
        searchTimeout.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await api.get(`/api/clients?search=${encodeURIComponent(text)}&limit=15`);
                setSearchResults(res.data);
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 350);
    };

    const selectClient = (client: ClientSearchResult) => {
        setSelectedClient(client);
        setShowClientModal(false);
        setSearchQuery('');
        setSearchResults([]);
        // Si le client a une seule propriété → sélection auto
        if (client.properties && client.properties.length === 1) {
            setSelectedPropertyId(client.properties[0].id);
        } else {
            setSelectedPropertyId('');
        }
    };

    // ─── Créer un nouveau client ─────────────────────────────
    const handleCreateClient = async () => {
        if (!newClientName.trim()) {
            Alert.alert('Requis', 'Le nom du client est obligatoire.');
            return;
        }
        setCreatingClient(true);
        try {
            const res = await api.post('/api/clients', {
                name: newClientName.trim(),
                phone: newClientPhone.trim() || undefined,
                address: newClientAddress.trim() || undefined,
            });
            const { client, property } = res.data;
            selectClient(client);
            if (property) setSelectedPropertyId(property.id);
            setShowNewClientForm(false);
            setNewClientName('');
            setNewClientPhone('');
            setNewClientAddress('');
            Alert.alert('✅ Client créé', `${client.name} a été ajouté à la base de données.`);
        } catch {
            Alert.alert('Erreur', 'Impossible de créer le client. Réessaie.');
        } finally {
            setCreatingClient(false);
        }
    };

    // B-05 FIX: Add address inline when client has no property
    const handleAddAddress = async () => {
        if (!newAddress.trim() || !selectedClient) return;
        setAddingAddress(true);
        try {
            const res = await api.post('/api/clients', {
                name: selectedClient.name,
                phone: selectedClient.phone || undefined,
                address: newAddress.trim(),
            });
            // The API creates a new property, but since client exists,
            // we directly create a property via a dedicated endpoint if available,
            // otherwise we refresh the client data
            const { property } = res.data;
            if (property) {
                setSelectedPropertyId(property.id);
                // Merge new property into selected client
                setSelectedClient(prev => prev ? {
                    ...prev,
                    properties: [...(prev.properties || []), property]
                } : prev);
            }
            setShowAddAddressForm(false);
            setNewAddress('');
            Alert.alert('✅ Adresse ajoutée', 'La nouvelle adresse a été enregistrée.');
        } catch {
            Alert.alert('Erreur', 'Impossible d\'ajouter l\'adresse. Réessaie.');
        } finally {
            setAddingAddress(false);
        }
    };

    // ─── Soumettre le job ────────────────────────────────────
    const handleSubmit = async () => {
        if (!selectedClient) {
            Alert.alert('Manquant', 'Sélectionne un client.');
            return;
        }
        if (!selectedPropertyId) {
            Alert.alert('Manquant', 'Sélectionne une adresse.');
            return;
        }

        setSubmitting(true);
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) throw new Error('User not found');

            // Construire l'heure du job pour aujourd'hui
            const today = new Date();
            today.setHours(scheduledHour, scheduledMinute, 0, 0);

            const payload: QuickAddJobInput = {
                technicianId: userId,
                clientId: selectedClient.id,
                propertyId: selectedPropertyId,
                scheduledAt: today.toISOString(),
                description: description.trim() || undefined,
            };

            await api.post('/api/jobs/quick-add', payload);

            Alert.alert(
                '✅ Ajouté à ta route!',
                `${selectedClient.name} est maintenant dans ta journée à ${scheduledHour}h${scheduledMinute.toString().padStart(2, '0')}.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error(error);
            Alert.alert('Erreur', 'Impossible d\'ajouter le job. Réessaie.');
        } finally {
            setSubmitting(false);
        }
    };

    const selectedProperty = selectedClient?.properties?.find(p => p.id === selectedPropertyId);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

                {/* ── En-tête ────────────────────────────────── */}
                <View style={styles.header}>
                    <Text style={styles.headerEmoji}>📞</Text>
                    <View>
                        <Text style={styles.headerTitle}>Appel entrant</Text>
                        <Text style={styles.headerSub}>Ajouter à ta route du jour</Text>
                    </View>
                </View>

                {/* ── Sélection client ───────────────────────── */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Client</Text>

                    {selectedClient ? (
                        <View style={styles.selectedBox}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.selectedName}>{selectedClient.name}</Text>
                                {selectedClient.phone && (
                                    <Text style={styles.selectedSub}>📱 {selectedClient.phone}</Text>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => { setSelectedClient(null); setSelectedPropertyId(''); }}>
                                <Text style={styles.changeBtn}>Changer</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{ gap: 8 }}>
                            <TouchableOpacity
                                style={styles.selectorBtn}
                                onPress={() => setShowClientModal(true)}
                            >
                                <Text style={styles.selectorBtnText}>🔍 Rechercher un client existant</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.selectorBtn, styles.selectorBtnSecondary]}
                                onPress={() => setShowNewClientForm(true)}
                            >
                                <Text style={[styles.selectorBtnText, { color: '#16a34a' }]}>➕ Nouveau client (appel)</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* ── Sélection adresse ─────────────────────── */}
                {selectedClient && (
                    <View style={styles.card}>
                        <Text style={styles.sectionLabel}>Adresse</Text>
                        {(selectedClient.properties?.length ?? 0) === 0 ? (
                            // B-05 FIX: Dead-end eliminated — offer inline address addition
                            showAddAddressForm ? (
                                <View>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ex: 123 Rue Principale, Montréal"
                                        value={newAddress}
                                        onChangeText={setNewAddress}
                                        autoFocus
                                    />
                                    <TouchableOpacity
                                        style={[styles.submitBtn, { marginTop: 8, padding: 12 }, addingAddress && styles.submitBtnDisabled]}
                                        onPress={handleAddAddress}
                                        disabled={addingAddress}
                                    >
                                        {addingAddress
                                            ? <ActivityIndicator color="white" />
                                            : <Text style={styles.submitBtnText}>✅ Enregistrer l'adresse</Text>
                                        }
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setShowAddAddressForm(false)} style={{ marginTop: 8, alignItems: 'center' }}>
                                        <Text style={{ color: '#6b7280' }}>Annuler</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={{ alignItems: 'center', gap: 8 }}>
                                    <Text style={styles.noData}>⚠️ Aucune adresse enregistrée pour ce client.</Text>
                                    <TouchableOpacity
                                        style={[styles.selectorBtn, styles.selectorBtnSecondary]}
                                        onPress={() => setShowAddAddressForm(true)}
                                    >
                                        <Text style={[styles.selectorBtnText, { color: '#16a34a' }]}>➕ Ajouter une adresse maintenant</Text>
                                    </TouchableOpacity>
                                </View>
                            )
                        ) : selectedProperty ? (
                            <View style={styles.selectedBox}>
                                <Text style={{ flex: 1, fontSize: 15, color: '#1f2937' }}>
                                    📍 {selectedProperty.address}
                                </Text>
                                {(selectedClient.properties?.length ?? 0) > 1 && (
                                    <TouchableOpacity onPress={() => setShowPropertyModal(true)}>
                                        <Text style={styles.changeBtn}>Changer</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.selectorBtn}
                                onPress={() => setShowPropertyModal(true)}
                            >
                                <Text style={styles.selectorBtnText}>📍 Sélectionner une adresse</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* ── Heure du job ───────────────────────────── */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Heure prévue</Text>
                    <View style={styles.timeRow}>
                        {/* P-04 FIX: Extended hours 6h-22h to cover emergencies and evening jobs */}
                        {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map(h => (
                            <TouchableOpacity
                                key={h}
                                style={[styles.timeChip, scheduledHour === h && styles.timeChipActive]}
                                onPress={() => setScheduledHour(h)}
                            >
                                <Text style={[styles.timeChipText, scheduledHour === h && styles.timeChipTextActive]}>
                                    {h}h
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.minuteRow}>
                        {[0, 15, 30, 45].map(m => (
                            <TouchableOpacity
                                key={m}
                                style={[styles.minuteChip, scheduledMinute === m && styles.minuteChipActive]}
                                onPress={() => setScheduledMinute(m)}
                            >
                                <Text style={[styles.minuteChipText, scheduledMinute === m && styles.minuteChipTextActive]}>
                                    :{m.toString().padStart(2, '0')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.timeSummary}>
                        ⏰ Aujourd'hui à {scheduledHour}h{scheduledMinute.toString().padStart(2, '0')}
                    </Text>
                </View>

                {/* ── Description ────────────────────────────── */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Description (optionnel)</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Ex: Traitement souris, 2e visite, client urgent..."
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {/* ── Bouton soumettre ───────────────────────── */}
                <TouchableOpacity
                    style={[styles.submitBtn, (!selectedClient || !selectedPropertyId || submitting) && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={!selectedClient || !selectedPropertyId || submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.submitBtnText}>✅ Ajouter à ma route d'aujourd'hui</Text>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── Modal Recherche Client ─────────────────────── */}
            <Modal visible={showClientModal} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>🔍 Rechercher un client</Text>
                        <TouchableOpacity onPress={() => setShowClientModal(false)}>
                            <Text style={styles.modalClose}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Nom, téléphone ou email..."
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                        autoFocus
                    />
                    {searching && <ActivityIndicator style={{ marginTop: 20 }} color="#2563eb" />}
                    <ScrollView keyboardShouldPersistTaps="handled">
                        {searchResults.map(client => (
                            <TouchableOpacity
                                key={client.id}
                                style={styles.resultItem}
                                onPress={() => selectClient(client)}
                            >
                                <Text style={styles.resultName}>{client.name}</Text>
                                {client.phone && <Text style={styles.resultSub}>📱 {client.phone}</Text>}
                                {client.properties && client.properties.length > 0 && (
                                    <Text style={styles.resultSub}>📍 {client.properties[0].address}</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                        {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                            <View style={styles.noResultBox}>
                                <Text style={styles.noResultText}>Aucun client trouvé</Text>
                                <TouchableOpacity
                                    style={styles.createFromSearchBtn}
                                    onPress={() => {
                                        setShowClientModal(false);
                                        setNewClientName(searchQuery);
                                        setShowNewClientForm(true);
                                    }}
                                >
                                    <Text style={styles.createFromSearchText}>➕ Créer "{searchQuery}"</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Modal>

            {/* ── Modal Sélection Propriété ─────────────────── */}
            <Modal visible={showPropertyModal} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>📍 Choisir une adresse</Text>
                        <TouchableOpacity onPress={() => setShowPropertyModal(false)}>
                            <Text style={styles.modalClose}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView>
                        {selectedClient?.properties?.map(prop => (
                            <TouchableOpacity
                                key={prop.id}
                                style={[styles.resultItem, selectedPropertyId === prop.id && styles.resultItemSelected]}
                                onPress={() => { setSelectedPropertyId(prop.id); setShowPropertyModal(false); }}
                            >
                                <Text style={styles.resultName}>{prop.address}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>

            {/* ── Modal Nouveau Client ───────────────────────── */}
            <Modal visible={showNewClientForm} animationType="slide" presentationStyle="pageSheet">
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>➕ Nouveau client</Text>
                            <TouchableOpacity onPress={() => setShowNewClientForm(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView keyboardShouldPersistTaps="handled">
                            <Text style={styles.inputLabel}>Nom *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Jean Tremblay"
                                value={newClientName}
                                onChangeText={setNewClientName}
                                autoFocus
                            />
                            <Text style={styles.inputLabel}>Téléphone</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: 514-555-1234"
                                value={newClientPhone}
                                onChangeText={setNewClientPhone}
                                keyboardType="phone-pad"
                            />
                            <Text style={styles.inputLabel}>Adresse</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: 123 Rue Principale, Montréal"
                                value={newClientAddress}
                                onChangeText={setNewClientAddress}
                            />
                            <TouchableOpacity
                                style={[styles.submitBtn, creatingClient && styles.submitBtnDisabled]}
                                onPress={handleCreateClient}
                                disabled={creatingClient}
                            >
                                {creatingClient
                                    ? <ActivityIndicator color="white" />
                                    : <Text style={styles.submitBtnText}>✅ Créer le client</Text>
                                }
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 16 },

    header: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#1e40af', borderRadius: 16,
        padding: 16, marginBottom: 16,
    },
    headerEmoji: { fontSize: 36 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
    headerSub: { fontSize: 14, color: '#bfdbfe' },

    card: {
        backgroundColor: 'white', borderRadius: 14,
        padding: 16, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
    },
    sectionLabel: {
        fontSize: 12, fontWeight: '700', color: '#6b7280',
        textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5,
    },

    selectedBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f0fdf4', borderRadius: 10,
        padding: 12, borderWidth: 1, borderColor: '#bbf7d0',
    },
    selectedName: { fontSize: 17, fontWeight: 'bold', color: '#1f2937' },
    selectedSub: { fontSize: 14, color: '#4b5563', marginTop: 2 },
    changeBtn: { color: '#2563eb', fontWeight: '600', fontSize: 14 },

    selectorBtn: {
        backgroundColor: '#eff6ff', borderRadius: 10,
        padding: 14, alignItems: 'center',
        borderWidth: 1, borderColor: '#bfdbfe',
    },
    selectorBtnSecondary: {
        backgroundColor: '#f0fdf4', borderColor: '#bbf7d0',
    },
    selectorBtnText: { fontSize: 15, fontWeight: '600', color: '#1d4ed8' },

    noData: { color: '#9ca3af', fontSize: 14, textAlign: 'center', paddingVertical: 8 },

    timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    timeChip: {
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 20, backgroundColor: '#f3f4f6',
        borderWidth: 1, borderColor: '#e5e7eb',
    },
    timeChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    timeChipText: { fontSize: 14, color: '#4b5563', fontWeight: '600' },
    timeChipTextActive: { color: 'white' },

    minuteRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    minuteChip: {
        flex: 1, paddingVertical: 8, alignItems: 'center',
        borderRadius: 10, backgroundColor: '#f3f4f6',
        borderWidth: 1, borderColor: '#e5e7eb',
    },
    minuteChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    minuteChipText: { fontSize: 14, color: '#4b5563', fontWeight: '600' },
    minuteChipTextActive: { color: 'white' },

    timeSummary: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 4 },

    textArea: {
        backgroundColor: '#f9fafb', borderRadius: 10,
        padding: 12, borderWidth: 1, borderColor: '#e5e7eb',
        fontSize: 15, minHeight: 80, textAlignVertical: 'top',
    },

    submitBtn: {
        backgroundColor: '#1e40af', borderRadius: 14,
        padding: 18, alignItems: 'center', marginTop: 8,
        shadowColor: '#1e40af', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    submitBtnDisabled: { backgroundColor: '#93c5fd', shadowOpacity: 0 },
    submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

    // Modals
    modal: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 60 },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 20,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
    modalClose: { fontSize: 20, color: '#6b7280', padding: 4 },

    searchInput: {
        backgroundColor: '#f3f4f6', borderRadius: 12,
        padding: 14, fontSize: 16,
        borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12,
    },
    resultItem: {
        padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
    },
    resultItemSelected: { backgroundColor: '#eff6ff' },
    resultName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
    resultSub: { fontSize: 14, color: '#6b7280', marginTop: 2 },

    noResultBox: { alignItems: 'center', paddingVertical: 30 },
    noResultText: { color: '#9ca3af', fontSize: 15, marginBottom: 16 },
    createFromSearchBtn: {
        backgroundColor: '#f0fdf4', borderRadius: 10,
        paddingHorizontal: 20, paddingVertical: 12,
        borderWidth: 1, borderColor: '#bbf7d0',
    },
    createFromSearchText: { color: '#16a34a', fontWeight: '700', fontSize: 15 },

    inputLabel: {
        fontSize: 13, fontWeight: '600', color: '#374151',
        marginBottom: 6, marginTop: 14,
    },
    input: {
        backgroundColor: '#f9fafb', borderRadius: 10,
        padding: 13, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 15,
    },
});
