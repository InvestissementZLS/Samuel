import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export interface PushNotificationState {
    expoPushToken?: Notifications.ExpoPushToken;
    notification?: Notifications.Notification;
    requestToken: () => Promise<string | undefined>;
}

export const usePushNotifications = (): PushNotificationState => {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true
        }),
    });

    const [expoPushToken, setExpoPushToken] = useState<Notifications.ExpoPushToken>();
    const [notification, setNotification] = useState<Notifications.Notification>();

    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    async function registerForPushNotificationsAsync() {
        let token;
        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync({
                    ios: { allowAlert: true, allowBadge: true, allowSound: true },
                });
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return;
            }

            try {
                const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
                if (!projectId) {
                    console.log('Project ID not found');
                }
                token = await Notifications.getExpoPushTokenAsync({
                    projectId,
                });
            } catch (e) {
                console.error(e);
            }
        } else {
            console.log('Must use physical device for Push Notifications');
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        return token;
    }

    const requestToken = async () => {
        const token = await registerForPushNotificationsAsync();
        if (token) {
            setExpoPushToken(token);
            return token.data;
        }
        return undefined;
    };

    useEffect(() => {
        registerForPushNotificationsAsync().then((token) => {
            if (token) setExpoPushToken(token);
        });

        notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            console.log('Notification response:', response);
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    return { expoPushToken, notification, requestToken };
};
