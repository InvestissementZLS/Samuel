import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL } from '../config';

export default function AddExpenseScreen({ navigation, route }: any) {
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Gas'); // default category
    const [description, setDescription] = useState('');
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [cameraRef, setCameraRef] = useState<any>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const userId = route.params?.userId || 'mock-user-id';

    useEffect(() => {
        (async () => {
            const cameraStatus = await Camera.requestCameraPermissionsAsync();
            setHasPermission(cameraStatus.status === 'granted');
        })();
    }, []);

    const takePicture = async () => {
        if (cameraRef) {
            const photoData = await cameraRef.takePictureAsync({ quality: 0.5 });
            setPhoto(photoData.uri);
        }
    };

    const retakePicture = () => {
        setPhoto(null);
    };

    const handleSubmit = async () => {
        if (!amount || isNaN(Number(amount))) {
            Alert.alert('Erreur', 'Veuillez entrer un montant valide.');
            return;
        }
        if (!category) {
            Alert.alert('Erreur', 'Veuillez choisir une catégorie.');
            return;
        }
        if (!photo) {
            Alert.alert('Erreur', 'Veuillez prendre une photo du reçu.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('amount', amount);
            formData.append('category', category);
            formData.append('description', description);
            formData.append('userId', userId);
            formData.append('date', new Date().toISOString());

            const filename = photo.split('/').pop() || 'receipt.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;

            formData.append('receipt', {
                uri: photo,
                name: filename,
                type,
            } as any);

            await axios.post(`${API_URL}/api/expenses`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            Alert.alert('Succès', 'Dépense soumise avec succès !', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Erreur', 'Impossible de soumettre la dépense. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    if (hasPermission === null) {
        return <View style={styles.container}><Text>Demande d'autorisation de la caméra...</Text></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.container}><Text>Pas d'accès à la caméra</Text></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                    <Text style={styles.title}>Nouvelle Dépense</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Montant ($)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="ex: 45.50"
                            keyboardType="decimal-pad"
                            value={amount}
                            onChangeText={setAmount}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Catégorie</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="ex: Essence, Repas, Matériel..."
                            value={category}
                            onChangeText={setCategory}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Notes / Description</Text>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            placeholder="Details de la dépense..."
                            multiline
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>

                    <Text style={styles.label}>Reçu / Facture</Text>
                    <View style={styles.cameraContainer}>
                        {photo ? (
                            <Image source={{ uri: photo }} style={styles.preview} />
                        ) : (
                            <CameraView style={styles.camera} ref={(ref: any) => setCameraRef(ref)} facing="back">
                                <View style={styles.buttonContainer}></View>
                            </CameraView>
                        )}
                    </View>

                    <View style={styles.actionContainer}>
                        {photo ? (
                            <TouchableOpacity style={styles.secondaryButton} onPress={retakePicture}>
                                <Text style={styles.secondaryButtonText}>Reprendre la photo</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.primaryButton} onPress={takePicture}>
                                <Text style={styles.primaryButtonText}>Prendre le reçu en photo</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.submitButton, (!amount || !photo || loading) && styles.disabledButton]}
                            onPress={handleSubmit}
                            disabled={!amount || !photo || loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Soumettre la dépense</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    inputContainer: { marginBottom: 15 },
    label: { fontSize: 16, marginBottom: 5, fontWeight: '600' },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#f9f9f9' },
    cameraContainer: { height: 300, borderRadius: 12, overflow: 'hidden', marginBottom: 20, backgroundColor: '#000' },
    camera: { flex: 1 },
    preview: { flex: 1, width: '100%', height: '100%' },
    buttonContainer: { flex: 1, backgroundColor: 'transparent', flexDirection: 'row', margin: 20 },
    actionContainer: { gap: 10 },
    primaryButton: { backgroundColor: '#2563EB', padding: 15, borderRadius: 10, alignItems: 'center' },
    primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    secondaryButton: { backgroundColor: '#6B7280', padding: 15, borderRadius: 10, alignItems: 'center' },
    secondaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    submitButton: { backgroundColor: '#10B981', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    disabledButton: { opacity: 0.5 },
});
