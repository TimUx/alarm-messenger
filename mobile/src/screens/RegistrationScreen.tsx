import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { Camera } from 'react-native-vision-camera';
import { deviceService, setApiBaseUrl } from '../services/api';
import { storageService } from '../services/storage';
import { getFCMToken, requestUserPermission } from '../services/notifications';
import { useTheme } from '../context/ThemeContext';

interface Props {
  onRegistrationComplete: () => void;
}

const RegistrationScreen: React.FC<Props> = ({ onRegistrationComplete }) => {
  const { theme } = useTheme();
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const hasPermission = await requestUserPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications to receive emergency alerts.'
      );
    }
  };

  const onQRCodeRead = async (e: any) => {
    try {
      setScanning(false);
      const data = JSON.parse(e.data);
      const { token, serverUrl } = data;

      // Save server URL
      await storageService.saveServerUrl(serverUrl);
      setApiBaseUrl(serverUrl);

      // Get FCM token
      const fcmToken = await getFCMToken();
      if (!fcmToken) {
        Alert.alert('Error', 'Failed to get FCM token');
        return;
      }

      // Register device
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const device = await deviceService.register(token, fcmToken, platform);

      // Save device info
      await storageService.saveDeviceToken(token);
      await storageService.saveDeviceId(device.id);

      Alert.alert('Success', 'Device registered successfully!', [
        { text: 'OK', onPress: onRegistrationComplete },
      ]);
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to register device. Please try again.');
      setScanning(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Alarm Messenger</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Scan QR Code to Register</Text>

      {scanning ? (
        <QRCodeScanner
          onRead={onQRCodeRead}
          topContent={
            <Text style={[styles.instructions, { color: theme.colors.text }]}>
              Scan the QR code from the admin panel
            </Text>
          }
          bottomContent={
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => setScanning(false)}>
              <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setScanning(true)}>
          <Text style={styles.scanButtonText}>Start Scanning</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  scanButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 15,
    borderRadius: 10,
  },
  cancelButtonText: {
    fontSize: 16,
  },
});

export default RegistrationScreen;
