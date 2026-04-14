import { prisma } from './prisma';

interface PushMessage {
    targetUserId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
}

/**
 * Sends a push notification to a specific user via Expo's backend service.
 */
export async function sendPushNotification({ targetUserId, title, body, data = {} }: PushMessage) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { expoPushToken: true }
        });

        if (!user || !user.expoPushToken) {
            console.log(`[PushNotification] User ${targetUserId} has no push token`);
            return { success: false, error: 'No push token provided for this user' };
        }

        // Validate token format roughly
        if (!user.expoPushToken.startsWith('ExponentPushToken[') && !user.expoPushToken.startsWith('ExpoPushToken[')) {
            return { success: false, error: 'Invalid Expo push token format' };
        }

        const message = {
            to: user.expoPushToken,
            sound: 'default',
            title,
            body,
            data,
        };

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        const result = await response.json();

        if (result.errors) {
            console.error(`[PushNotification] API error for ${targetUserId}:`, result.errors);
            return { success: false, error: result.errors };
        }

        console.log(`[PushNotification] Sent successfully to ${targetUserId}`);
        return { success: true, data: result.data };

    } catch (error: any) {
        console.error(`[PushNotification] Failed to send to ${targetUserId}:`, error);
        return { success: false, error: error.message };
    }
}
