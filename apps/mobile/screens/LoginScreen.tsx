import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import axios from 'axios';
import { API_URL } from '../config';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
    const navigation = useNavigation<LoginScreenNavigationProp>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Erreur', 'Veuillez entrer votre courriel et mot de passe.');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/auth/login`, {
                email,
                password,
            });

            const user = response.data;

            try {
                const timesheetRes = await axios.get(`${API_URL}/api/timesheets/active?userId=${user.id}`);
                const activeTimesheet = timesheetRes.data.timesheet;

                if (activeTimesheet) {
                    navigation.replace('JobList', { userId: user.id });
                } else {
                    navigation.replace('PunchIn', { userId: user.id });
                }
            } catch (tError) {
                console.error('Failed to check timesheet status', tError);
                navigation.replace('JobList', { userId: user.id });
            }

        } catch (error: any) {
            console.error(error);
            Alert.alert('Connexion échouée', error.response?.data?.error || 'Une erreur est survenue.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar style="dark" />

            {/* Logo / Brand */}
            <View style={styles.brandContainer}>
                <View style={styles.logoCircle}>
                    <Text style={styles.logoText}>ZLS</Text>
                </View>
                <Text style={styles.brandName}>Field Service</Text>
                <Text style={styles.brandSubtitle}>Espace Technicien</Text>
            </View>

            {/* Form Card */}
            <View style={styles.card}>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Courriel</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="tech@exemple.com"
                        placeholderTextColor="#9ca3af"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Mot de passe</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="#9ca3af"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.buttonText}>Se connecter</Text>
                    )}
                </TouchableOpacity>
            </View>

            <Text style={styles.footer}>ZLS Field Service App © 2025</Text>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4ff',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    brandContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoCircle: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    logoText: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    brandName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1e3a8a',
        letterSpacing: 0.5,
    },
    brandSubtitle: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
    card: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    inputContainer: {
        marginBottom: 18,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    input: {
        backgroundColor: '#f9fafb',
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        fontSize: 15,
        color: '#111827',
    },
    button: {
        backgroundColor: '#2563eb',
        width: '100%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    footer: {
        position: 'absolute',
        bottom: 32,
        fontSize: 11,
        color: '#9ca3af',
    },
});
