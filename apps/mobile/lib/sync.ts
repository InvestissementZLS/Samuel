import * as Network from 'expo-network';
import axios from 'axios';
import { getOutbox, removeFromOutbox, saveJobsToLocal, addToOutbox } from './db';
import { API_URL } from '../config';
import { Alert } from 'react-native';

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
}

// Process the Outbox: Send queued requests
export const syncOutbox = async () => {
    const connected = await isConnected();
    if (!connected) return;

    const items = getOutbox() as OutboxItem[];
    if (items.length === 0) return;

    console.log(`Syncing ${items.length} outbox items...`);

    for (const item of items) {
        try {
            const body = JSON.parse(item.body);
            // Construct full URL (stored url might be relative or full, let's assume relative usually but I stored what I passed)
            // If I plan to use this generally, I should standardize.
            // For now, I'll update the calling code to store full URLs or handle it here.

            // Assuming stored URL is full for simplicity in this iteration
            const url = item.url.startsWith('http') ? item.url : `${API_URL}${item.url}`;

            if (item.method === 'POST') {
                await axios.post(url, body);
            } else if (item.method === 'PUT') {
                await axios.put(url, body);
            } else if (item.method === 'UPLOAD') {
                // Reconstruct FormData
                const formData = new FormData();
                // body should contain file meta { uri, name, type } and extra fields like { caption }
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

                await fetch(url, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            // If successful, remove from queue
            removeFromOutbox(item.id);
        } catch (error) {
            console.error(`Failed to sync item ${item.id}`, error);
            // Decide: Retry later? Delete if 4xx?
            // For now, leave it. It will retry next sync.
            // If 400 Bad Request, we should probably delete it to avoid blocking forever.
            if (axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500) {
                console.warn("Removing bad request from outbox");
                removeFromOutbox(item.id);
            }
        }
    }
};

// Full Sync: Push Outbox then Pull Jobs
export const syncData = async (userId: string) => {
    const connected = await isConnected();

    // 1. Try to push changes first
    if (connected) {
        await syncOutbox();
    }

    // 2. Fetch fresh data if online
    if (connected) {
        try {
            console.log("Fetching fresh jobs...");
            const response = await axios.get(`${API_URL}/api/technician/jobs?techId=${userId}`);
            saveJobsToLocal(response.data);
            return response.data;
        } catch (error) {
            console.error("Fetch failed, using cache", error);
        }
    }

    // 3. Return local data (whether we fetched new or not, now the DB is the source of truth)
    // Actually, if we fetched, we saved to DB. So getLocalJobs() is always safe.
    // However, if we are offline, we just return local.
    return []; // The caller should call getLocalJobs() separately or we return it here.
};

// Helper to make an API call or queue it if offline
export const apiCall = async (url: string, method: 'POST' | 'PUT', body: any) => {
    const connected = await isConnected();

    if (connected) {
        try {
            if (method === 'POST') return await axios.post(url, body);
            if (method === 'PUT') return await axios.put(url, body);
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

            const res = await fetch(url, {
                method: 'POST',
                body: formData,
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (!res.ok) throw new Error("Upload failed");
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
