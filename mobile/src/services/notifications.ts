import { Platform, PermissionsAndroid } from 'react-native';
import { websocketService } from './websocket';

export const requestUserPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
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
  // iOS doesn't need explicit permission for WebSocket notifications
  return true;
};

export const getFCMToken = async (): Promise<string | null> => {
  // No longer using FCM tokens, return null
  // Registration now only uses device ID
  return null;
};

export const onMessageReceived = (
  callback: (message: any) => void
): (() => void) => {
  // Set up WebSocket message handler
  const unsubscribeWS = websocketService.onMessage((message) => {
    console.log('WebSocket message received:', message);
    // Transform WebSocket message to match expected format
    const transformedMessage = {
      data: message.data,
      notification: message.notification,
    };
    callback(transformedMessage);
  });

  return unsubscribeWS;
};

export const setBackgroundMessageHandler = (
  handler: (message: any) => Promise<void>
): void => {
  // Background message handling is not needed for WebSocket
  // Messages are handled when app is in foreground through WebSocket
  console.log('Background message handler not needed with WebSocket');
};

// Initialize WebSocket connection
export const initializeWebSocket = (serverUrl: string, deviceId: string): void => {
  websocketService.connect(serverUrl, deviceId);
};

// Disconnect WebSocket
export const disconnectWebSocket = (): void => {
  websocketService.disconnect();
};
