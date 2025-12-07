import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import { websocketService } from './websocket';

export const requestUserPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      return enabled;
    } catch (error) {
      console.warn('Firebase messaging not available, will use WebSocket only:', error);
      return true; // Return true since we can still use WebSocket
    }
  } else if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.warn('Permission request failed:', error);
        return false;
      }
    }
    return true;
  }
  return false;
};

export const getFCMToken = async (): Promise<string | null> => {
  try {
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.warn('Firebase messaging not available, will use WebSocket only:', error);
    return null; // Return null, WebSocket will be used instead
  }
};

export const onMessageReceived = (
  callback: (message: any) => void
): (() => void) => {
  const unsubscribers: Array<() => void> = [];

  // Set up Firebase foreground message handler (if available)
  try {
    const unsubscribeFCM = messaging().onMessage(async (remoteMessage) => {
      console.log('Firebase foreground message received:', remoteMessage);
      callback(remoteMessage);
    });
    unsubscribers.push(unsubscribeFCM);
  } catch (error) {
    console.warn('Firebase messaging not available:', error);
  }

  // Set up WebSocket message handler
  const unsubscribeWS = websocketService.onMessage((message) => {
    console.log('WebSocket message received:', message);
    // Transform WebSocket message to match Firebase format
    const transformedMessage = {
      data: message.data,
      notification: message.notification,
    };
    callback(transformedMessage);
  });
  unsubscribers.push(unsubscribeWS);

  // Return combined unsubscribe function
  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
};

export const setBackgroundMessageHandler = (
  handler: (message: any) => Promise<void>
): void => {
  try {
    messaging().setBackgroundMessageHandler(handler);
  } catch (error) {
    console.warn('Firebase background handler not available:', error);
  }
};

// New function to initialize WebSocket connection
export const initializeWebSocket = (serverUrl: string, deviceId: string): void => {
  websocketService.connect(serverUrl, deviceId);
};

// New function to disconnect WebSocket
export const disconnectWebSocket = (): void => {
  websocketService.disconnect();
};
