import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCATION_TASK_NAME } from '../services/LocationTask';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { STORAGE_KEYS } from '../services/api';
import { API_URL } from '../config';

export default function PunchInScreen({ navigation, route }: any) {
    const [km, setKm] = useState('');
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [cameraRef, setCameraRef] = useState<any>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // B-01 FIX: Read userId using the centralized STORAGE_KEYS constant
    const userId = route.params?.userId;

    useEffect(() => {
        (async () => {
            const cameraStatus = await Camera.requestCameraPermissionsAsync();
            const locationStatus = await Location.requestForegroundPermissionsAsync();
            let bgStatus = null;
            if (locationStatus.status === 'granted') {
                bgStatus = await Location.requestBackgroundPermissionsAsync();
            }
            setHasPermission(cameraStatus.status === 'granted' && locationStatus.status === 'granted');
        })();
    }, []);

    const takePicture = async () => {
        if (cameraRef) {
            // M-08 FIX: Capture without base64 — we'll send as FormData (file), not JSON string
            const photoData = await cameraRef.takePictureAsync({ quality: 0.6, base64: false });
            setPhoto(photoData.uri);
        }
    };

    const retakePicture = () => {
        setPhoto(null);
    };

    const handleSubmit = async () => {
        if (!km || isNaN(parseInt(km))) {
            Alert.alert('Requis', 'Entrez le kilométrage actuel de l\'odomètre.');
            return;
        }
        if (!photo) {
            Alert.alert('Requis', 'Prenez une photo de l\'odomètre pour continuer.');
            return;
        }

        setLoading(true);
        try {
            let location = await Location.getLastKnownPositionAsync();
            if (!location) {
                location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            }
            const { latitude, longitude } = location.coords;

            // M-08 + B-06 FIX: Send photo as FormData (real file) instead of JSON URI string.
            // The server will upload the actual file to Supabase Storage.
            const formData = new FormData();
            formData.append('userId', userId);
            formData.append('km', km);
            formData.append('lat', String(latitude));
            formData.append('lng', String(longitude));

            // Attach the actual photo file
            const filename = `odometer-${userId}-${Date.now()}.jpg`;
            // @ts-ignore — React Native FormData accepts this shape
            formData.append('photo', {
                uri: photo,
                name: filename,
                type: 'image/jpeg',
            });

            const response = await api.post(`/api/timesheets/punch-in`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 30000, // Extra time for photo upload on slow LTE
            });

            const { timesheetId } = response.data;

            // Start Background Tracking
            try {
                await AsyncStorage.setItem('activeTimesheetId', timesheetId);
                const bgStatus = await Location.getBackgroundPermissionsAsync();
                if (bgStatus.status === 'granted') {
                    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 600000, // 10 minutes
                        distanceInterval: 100, // 100 meters
                        showsBackgroundLocationIndicator: true,
                        foregroundService: {
                            notificationTitle: "Tracking Active",
                            notificationBody: "Your location is being tracked while working.",
                        }
                    });
                } else {
                    console.log("Background location permission not granted, skipping tracking.");
                }
            } catch (e) {
                console.error("Failed to start background tracking", e);
                // Do not block punch in if tracking fails
            }

            Alert.alert('✅ Journée démarrée!', 'Punch In réussi. Bonne journée!', [
                { text: 'OK', onPress: () => navigation.replace('JobList', { userId }) }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Erreur', 'Impossible de soumettre. Vérifie ta connexion et réessaie.');
        } finally {
            setLoading(false);
        }
    };

    if (hasPermission === null) {
        return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.container}><Text>No access to camera or location</Text></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>🗓️ Début de journée</Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Kilométrage actuel (KM)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: 12345"
                    keyboardType="numeric"
                    value={km}
                    onChangeText={setKm}
                />
            </View>

            <View style={styles.cameraContainer}>
                {photo ? (
                    <Image source={{ uri: photo }} style={styles.preview} />
                ) : (
                    <CameraView style={styles.camera} ref={(ref) => setCameraRef(ref)} facing="back">
                        <View style={styles.buttonContainer} />
                    </CameraView>
                )}
            </View>

            <View style={styles.actionContainer}>
                {photo ? (
                    <TouchableOpacity style={styles.secondaryButton} onPress={retakePicture}>
                        <Text style={styles.secondaryButtonText}>🔄 Reprendre la photo</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.primaryButton} onPress={takePicture}>
                        <Text style={styles.primaryButtonText}>📸 Photographier l'odomètre</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.submitButton, (!km || !photo || loading) && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={!km || !photo || loading}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.submitButtonText}>⏱️ Démarrer ma journée</Text>
                    }
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    inputContainer: { marginBottom: 20 },
    label: { fontSize: 16, marginBottom: 5, fontWeight: '600' },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 18 },
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
