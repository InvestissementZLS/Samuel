import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config';

export const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Location Task Error:', error);
        return;
    }

    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };

        try {
            const timesheetId = await AsyncStorage.getItem('activeTimesheetId');

            if (timesheetId && locations && locations.length > 0) {
                // Format for our API
                const formattedLocations = locations.map(loc => ({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    speed: loc.coords.speed,
                    heading: loc.coords.heading,
                    accuracy: loc.coords.accuracy,
                    timestamp: loc.timestamp,
                }));

                await axios.post(`${API_URL}/api/timesheets/track`, {
                    timesheetId,
                    locations: formattedLocations
                });

                console.log(`[Background] Sent ${locations.length} locations for timesheet ${timesheetId}`);
            }
        } catch (err) {
            console.error('[Background] Failed to upload locations', err);
        }
    }
});
