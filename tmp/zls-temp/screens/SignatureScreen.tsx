import React, { useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type SignatureScreenProp = StackNavigationProp<RootStackParamList, 'Signature'>;

export default function SignJobScreen() {
    const navigation = useNavigation<SignatureScreenProp>();
    const route = useRoute();
    const { onOK } = route.params as any; // Callback to pass data back
    const ref = useRef<any>(null);

    const handleOK = (signature: string) => {
        if (onOK) {
            onOK(signature); // Base64
            navigation.goBack();
        }
    };

    const handleClear = () => {
        ref.current.clearSignature();
    };

    const handleConfirm = () => {
        ref.current.readSignature();
    };

    const style = `.m-signature-pad--footer {display: none; margin: 0px;}`;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Client Signature</Text>
                <Text style={styles.subtitle}>Please sign below to confirm work completion.</Text>
            </View>

            <View style={styles.padContainer}>
                <SignatureScreen
                    ref={ref}
                    onOK={handleOK}
                    webStyle={style}
                    backgroundColor="white"
                    descriptionText=""
                />
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                    <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                    <Text style={styles.confirmBtnText}>Confirm Signature</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    header: {
        marginBottom: 20,
        alignItems: 'center'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333'
    },
    subtitle: {
        color: '#666',
        marginTop: 5
    },
    padContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'white'
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20
    },
    clearBtn: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        alignItems: 'center'
    },
    confirmBtn: {
        flex: 1,
        padding: 16,
        backgroundColor: '#2563eb', // Blue
        borderRadius: 12,
        alignItems: 'center'
    },
    clearBtnText: {
        fontWeight: '600',
        color: '#333'
    },
    confirmBtnText: {
        fontWeight: 'bold',
        color: 'white'
    }
});
