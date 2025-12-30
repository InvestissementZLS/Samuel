import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCATION_TASK_NAME } from '../services/LocationTask';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL } from '../config';

export default function PunchOutScreen({ navigation, route }: any) {
    const [km, setKm] = useState('');
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [cameraRef, setCameraRef] = useState<any>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    // const [type, setType] = useState(CameraType.back);

    const timesheetId = route.params?.timesheetId; // Passed from navigation

    useEffect(() => {
        (async () => {
            const cameraStatus = await Camera.requestCameraPermissionsAsync();
            const locationStatus = await Location.requestForegroundPermissionsAsync();
            setHasPermission(cameraStatus.status === 'granted' && locationStatus.status === 'granted');
        })();
    }, []);

    const takePicture = async () => {
        if (cameraRef) {
            const photoData = await cameraRef.takePictureAsync({ quality: 0.5, base64: true });
            setPhoto(photoData.uri);
        }
    };

    const handleSubmit = async () => {
        if (!km) {
            Alert.alert('Error', 'Please enter current Odometer KM.');
            return;
        }
        if (!photo) {
            Alert.alert('Error', 'Please take a photo of the Odometer.');
            return;
        }

        setLoading(true);
        try {
            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            await axios.post(`${API_URL}/api/timesheets/punch-out`, {
                timesheetId,
                km,
                photo,
                lat: latitude,
                lng: longitude,
            });

            Alert.alert('Success', 'Day Ended. Good job!', [
                { text: 'OK', onPress: () => navigation.replace('Login') } // Or back to a summary screen
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to submit. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (hasPermission === null) return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
    if (hasPermission === false) return <View style={styles.container}><Text>No access to camera/location</Text></View>;

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>End Day - Punch Out</Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>End Odometer (KM)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="12345"
                    keyboardType="numeric"
                    value={km}
                    onChangeText={setKm}
                />
            </View>

            <View style={styles.cameraContainer}>
                {photo ? (
                    <Image source={{ uri: photo }} style={styles.preview} />
                ) : (
                    <Camera style={styles.camera} ref={(ref) => setCameraRef(ref)} />
                )}
            </View>

            <View style={styles.actionContainer}>
                {!photo ? (
                    <TouchableOpacity style={styles.primaryButton} onPress={takePicture}>
                        <Text style={styles.primaryButtonText}>Take Photo</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setPhoto(null)}>
                        <Text style={styles.secondaryButtonText}>Retake</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.submitButton, (!km || !photo || loading) && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={!km || !photo || loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>End Day</Text>}
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
    actionContainer: { gap: 10 },
    primaryButton: { backgroundColor: '#2563EB', padding: 15, borderRadius: 10, alignItems: 'center' },
    primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    secondaryButton: { backgroundColor: '#6B7280', padding: 15, borderRadius: 10, alignItems: 'center' },
    secondaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    submitButton: { backgroundColor: '#EF4444', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    disabledButton: { opacity: 0.5 },
});
