import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import { Alert } from 'react-native';

// B-01 FIX: AsyncStorage key constants — prevents typo bugs
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'authToken',  // Signed JWT (replaces raw userId as Bearer token)
    USER_ID: 'userId',        // Still stored for quick access (non-auth uses)
    USER_ROLE: 'userRole',
    USER_NAME: 'userName',
    USER_EMAIL: 'userEmail',
    USER_DIVISIONS: 'userDivisions', // Store user's divisions (array stringified)
} as const;

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10 seconds timeout to prevent endless hanging on bad LTE
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Request Interceptor: Inject JWT Bearer Token
api.interceptors.request.use(
    async (config) => {
        try {
            // B-01 FIX: Send the signed JWT instead of the raw userId
            const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error("Error reading auth token for Auth header", error);
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
            console.warn("API responded with 401 Unauthorized. JWT expired or invalid.");
            // Wipe the stored credentials — forces re-login on next mount
            await AsyncStorage.multiRemove([
                STORAGE_KEYS.AUTH_TOKEN,
                STORAGE_KEYS.USER_ID,
                STORAGE_KEYS.USER_ROLE,
            ]);
            Alert.alert(
                "Session Expirée",
                "Votre session est expirée ou non valide. Veuillez vous reconnecter pour synchroniser les données."
            );
        }
        return Promise.reject(error);
    }
);

export default api;
