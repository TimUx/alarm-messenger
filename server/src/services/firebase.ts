import admin from 'firebase-admin';

let initialized = false;

export async function initializeFirebase(): Promise<void> {
  if (initialized) {
    return;
  }

  // Check if Firebase credentials are provided
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    console.warn('Firebase credentials not configured. Push notifications will not work.');
    console.warn('Please configure FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL in .env file');
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });
    initialized = true;
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

export async function sendPushNotification(
  deviceToken: string,
  title: string,
  body: string,
  data: any
): Promise<void> {
  if (!initialized) {
    console.warn('Firebase not initialized. Skipping push notification.');
    return;
  }

  try {
    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        type: 'emergency_alert',
      },
      token: deviceToken,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'max',
          channelId: 'emergency_alerts',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'emergency_alert.wav',
            contentAvailable: true,
            alert: {
              title,
              body,
            },
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

export async function sendBulkPushNotifications(
  deviceTokens: string[],
  title: string,
  body: string,
  data: any
): Promise<void> {
  if (!initialized) {
    console.warn('Firebase not initialized. Skipping push notifications.');
    return;
  }

  const promises = deviceTokens.map((token) =>
    sendPushNotification(token, title, body, data).catch((error) => {
      console.error(`Failed to send notification to ${token}:`, error);
    })
  );

  await Promise.all(promises);
}
