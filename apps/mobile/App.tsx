import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import './services/LocationTask'; // Register task
import { NavigationContainer } from '@react-navigation/native';
import { initDB } from './lib/db';
import { registerRootComponent } from 'expo';

export default function App() {
    useEffect(() => {
        initDB().catch(err => console.error("DB Init Failed", err));
    }, []);

    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <AppNavigator />
                <StatusBar style="auto" />
            </NavigationContainer>
        </SafeAreaProvider>
    );
}

registerRootComponent(App);
