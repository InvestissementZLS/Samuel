import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import { Alert } from 'react-native';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10 seconds timeout to prevent endless hanging on bad LTE
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Request Interceptor: Inject Bearer Token
api.interceptors.request.use(
    async (config) => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (userId) {
                config.headers.Authorization = `Bearer ${userId}`;
            }
        } catch (error) {
            console.error("Error reading userId for Auth header", error);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Catch 401 / Auth Errors globally
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && error.response.status === 401) {
            console.warn("API responded with 401 Unauthorized. Session expired.");
            // We can wipe the local userId so the app forces a re-login on next mount/refresh
            await AsyncStorage.removeItem('userId');
            Alert.alert(
                "Session Expirée",
                "Votre session est expirée ou non valide. Veuillez vous reconnecter pour synchroniser les données."
            );
        }
        return Promise.reject(error);
    }
);

export default api;
