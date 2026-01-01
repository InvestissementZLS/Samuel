import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCATION_TASK_NAME } from '../services/LocationTask';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL } from '../config';

export default function PunchInScreen({ navigation, route }: any) {
    const [km, setKm] = useState('');
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [cameraRef, setCameraRef] = useState<any>(null); // Use any for ref
    const [photo, setPhoto] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const userId = route.params?.userId || 'mock-user-id'; // Pass userId from auth context/params

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
            setPhoto(photoData.uri); // Use URI for display, base64 for upload if needed
        }
    };

    const retakePicture = () => {
        setPhoto(null);
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

            // In a real app, upload photo to S3/Blob here and get URL. 
            // We pass the local URI or base64 to backend for now.

            const response = await axios.post(`${API_URL}/api/timesheets/punch-in`, {
                userId,
                km,
                photo, // This sends the huge base64 string if configured, or just URI.
                lat: latitude,
                lng: longitude,
            });

            const { timesheetId } = response.data;

            // Start Background Tracking
            await AsyncStorage.setItem('activeTimesheetId', timesheetId);
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

            Alert.alert('Success', 'Punch In Successful!', [
                { text: 'OK', onPress: () => navigation.replace('JobList', { userId }) }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to submit. Please try again.');
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
            <Text style={styles.title}>Start Day - Punch In</Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Odometer (KM)</Text>
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
                    <CameraView style={styles.camera} ref={(ref) => setCameraRef(ref)} facing="back">
                        <View style={styles.buttonContainer}>
                            {/* Optional flip button if needed */}
                        </View>
                    </CameraView>
                )}
            </View>

            <View style={styles.actionContainer}>
                {photo ? (
                    <TouchableOpacity style={styles.secondaryButton} onPress={retakePicture}>
                        <Text style={styles.secondaryButtonText}>Retake Photo</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.primaryButton} onPress={takePicture}>
                        <Text style={styles.primaryButtonText}>Take Photo</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.submitButton, (!km || !photo || loading) && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={!km || !photo || loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Start Day</Text>}
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
