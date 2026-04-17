import * as Network from 'expo-network';
import api from '../services/api';
import axios from 'axios';
import { getOutbox, removeFromOutbox, saveJobsToLocal, addToOutbox, getLocalJobs, incrementOutboxRetry } from './db';
import { API_URL } from '../config';
import { Alert } from 'react-native';
import { DailyRunPayloadSchema } from './run-schema';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const isConnected = async () => {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected && state.isInternetReachable !== false;
};

interface OutboxItem {
    id: number;
    url: string;
    method: 'POST' | 'PUT' | 'UPLOAD';
    body: string;
    createdAt: string;
    retryCount?: number; // M-07 FIX: track retry attempts
}

const MAX_RETRIES = 3; // M-07 FIX: give up after 3 failed attempts

// Process the Outbox: Send queued requests
export const syncOutbox = async () => {
    const connected = await isConnected();
    if (!connected) return;

    const items = getOutbox() as OutboxItem[];
    if (items.length === 0) return;

    console.log(`Syncing ${items.length} outbox items...`);

    for (const item of items) {
        // M-07 FIX: Skip items that have exceeded max retries to prevent infinite server spam
        if ((item.retryCount ?? 0) >= MAX_RETRIES) {
            console.warn(`Outbox item ${item.id} exceeded ${MAX_RETRIES} retries — permanently removing.`);
            removeFromOutbox(item.id);
            continue;
        }

        try {
            const body = JSON.parse(item.body);
            const url = item.url;

            if (item.method === 'POST') {
                await api.post(url, body);
            } else if (item.method === 'PUT') {
                await api.put(url, body);
            } else if (item.method === 'UPLOAD') {
                const formData = new FormData();
                if (body.file) {
                    // @ts-ignore
                    formData.append('photo', {
                        uri: body.file.uri,
                        name: body.file.name,
                        type: body.file.type
                    });
                }
                if (body.caption) {
                    formData.append('caption', body.caption);
                }
                await api.post(url, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 20000
                });
            }

            // Success: remove from queue
            removeFromOutbox(item.id);
        } catch (error) {
            console.error(`Failed to sync outbox item ${item.id}`, error);
            if (axios.isAxiosError(error) && error.response) {
                if (error.response.status >= 400 && error.response.status < 500) {
                    // 4xx: Bad request — will never succeed, remove immediately
                    console.warn(`Removing 4xx bad request from outbox (status: ${error.response.status})`);
                    removeFromOutbox(item.id);
                } else {
                    // 5xx: Server error — increment retry count (leave for next sync)
                    incrementOutboxRetry(item.id);
                }
            } else {
                // Network error — increment retry count
                incrementOutboxRetry(item.id);
            }
        }
    }
};

// Full Sync: Push Outbox then Pull Jobs
export const syncData = async (userId: string, dateIsoString?: string) => {
    const connected = await isConnected();

    // 1. Try to push changes first
    if (connected) {
        await syncOutbox();
    }

    // 2. Fetch fresh data if online
    if (connected) {
        try {
            console.log("Fetching fresh jobs with Delta Sync...");
            const dateParams = dateIsoString ? `&date=${encodeURIComponent(dateIsoString)}` : '';
            
            // DELTA SYNC IMPLEMENTATION: Pass updatedSince to fetch partials
            const lastSync = await AsyncStorage.getItem(`lastSync_${userId}`);
            const syncParam = lastSync ? `&updatedSince=${encodeURIComponent(lastSync)}` : '';

            const response = await api.get(`/api/technician/jobs?techId=${userId}${dateParams}${syncParam}`);
            
            // PAYLOAD VALIDATION: Zod Sanitization to prevent crashes
            const validationResult = DailyRunPayloadSchema.safeParse(response.data);
            
            if (!validationResult.success) {
                console.error("Payload Validation Error! Malformed Schema from Server", validationResult.error);
                Alert.alert(
                    "Erreur de données",
                    "Le serveur a envoyé des données corrompues. L'application empêche un crash pur et dur. Utilisez le cache."
                );
                return [];
            }

            const cleanData = validationResult.data;
            saveJobsToLocal(cleanData); // Uses the strictly sanitized data
            
            // Update Sync Time
            await AsyncStorage.setItem(`lastSync_${userId}`, new Date().toISOString());

            // REMOVED 'return cleanData': We must let execution fall through so it returns the FULL COMBINED CACHE via getLocalJobs().
        } catch (error: any) {
            console.error("Fetch failed, using cache", error.message);
        }
    }

    // 3. M-02 FIX: Always return local cache (online or offline).
    // If online: we just fetched + saved fresh data to SQLite, so getLocalJobs() has latest.
    // If offline: we return the existing cache so technician is never left with an empty list.
    return getLocalJobs();
};

// Helper to make an API call or queue it if offline
export const apiCall = async (url: string, method: 'POST' | 'PUT', body: any) => {
    const connected = await isConnected();

    if (connected) {
        try {
            if (method === 'POST') return await api.post(url, body);
            if (method === 'PUT') return await api.put(url, body);
        } catch (error) {
            // If network error during call (flaky), queue it?
            console.warn("Online call failed, falling back to queue", error);
            addToOutbox(url, method, body);
            Alert.alert("Offline", "Saved to outbox. Will sync when online.");
            return { offline: true };
        }
    } else {
        addToOutbox(url, method, body);
        Alert.alert("Offline", "No internet. Action saved and will sync later.");
        return { offline: true };
    }
};

// Helper for offline uploads
export const apiUpload = async (url: string, fileAsset: any, caption: string) => {
    const connected = await isConnected();
    const payload = {
        file: {
            uri: fileAsset.uri,
            name: fileAsset.filename || 'photo.jpg',
            type: fileAsset.type || 'image/jpeg'
        },
        caption
    };

    if (connected) {
        try {
            const formData = new FormData();
            // @ts-ignore
            formData.append('photo', { uri: fileAsset.uri, name: payload.file.name, type: payload.file.type });
            formData.append('caption', caption);

            const res = await api.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 30000
            });
            return res;
        } catch (error) {
            console.warn("Upload failed, queuing", error);
            addToOutbox(url, 'UPLOAD', payload);
            Alert.alert("Offline", "Photo saved. Will upload when online.");
            return { offline: true };
        }
    } else {
        addToOutbox(url, 'UPLOAD', payload);
        Alert.alert("Offline", "No internet. Photo saved and will upload later.");
        return { offline: true };
    }
};
