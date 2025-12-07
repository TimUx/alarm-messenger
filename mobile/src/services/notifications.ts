import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';

export const requestUserPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    return enabled;
  } else if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
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
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const onMessageReceived = (
  callback: (message: any) => void
): (() => void) => {
  // Foreground message handler
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log('Foreground message received:', remoteMessage);
    callback(remoteMessage);
  });

  return unsubscribe;
};

export const setBackgroundMessageHandler = (
  handler: (message: any) => Promise<void>
): void => {
  messaging().setBackgroundMessageHandler(handler);
};
