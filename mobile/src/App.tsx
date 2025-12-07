import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import RegistrationScreen from './screens/RegistrationScreen';
import HomeScreen from './screens/HomeScreen';
import EmergencyAlertScreen from './screens/EmergencyAlertScreen';
import { storageService } from './services/storage';
import { emergencyService, setApiBaseUrl } from './services/api';
import { onMessageReceived } from './services/notifications';
import { alarmService } from './services/alarm';
import { Emergency, PushNotificationData } from './types';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const Stack = createStackNavigator();

const AppContent = () => {
  const { theme } = useTheme();
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentEmergency, setCurrentEmergency] = useState<Emergency | null>(null);

  useEffect(() => {
    checkRegistration();
    alarmService.initialize();

    // Set up push notification handler
    const unsubscribe = onMessageReceived(handlePushNotification);

    return () => {
      unsubscribe();
      alarmService.release();
    };
  }, []);

  const checkRegistration = async () => {
    try {
      const deviceToken = await storageService.getDeviceToken();
      const serverUrl = await storageService.getServerUrl();
      
      if (deviceToken && serverUrl) {
        setApiBaseUrl(serverUrl);
        setIsRegistered(true);
      }
    } catch (error) {
      console.error('Error checking registration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePushNotification = async (message: any) => {
    try {
      const data: PushNotificationData = message.data;
      const emergency = await emergencyService.getEmergency(data.emergencyId);
      setCurrentEmergency(emergency);
    } catch (error) {
      console.error('Error handling push notification:', error);
    }
  };

  const handleRegistrationComplete = () => {
    setIsRegistered(true);
  };

  const handleParticipate = async () => {
    if (!currentEmergency) return;

    try {
      const deviceId = await storageService.getDeviceId();
      if (!deviceId) {
        Alert.alert('Error', 'Device not registered');
        return;
      }

      await emergencyService.submitResponse(
        currentEmergency.id,
        deviceId,
        true
      );
      Alert.alert('Bestätigt', 'Teilnahme wurde gemeldet');
      setCurrentEmergency(null);
    } catch (error) {
      console.error('Error submitting participation:', error);
      Alert.alert('Error', 'Failed to submit response');
    }
  };

  const handleDecline = async () => {
    if (!currentEmergency) return;

    try {
      const deviceId = await storageService.getDeviceId();
      if (!deviceId) {
        Alert.alert('Error', 'Device not registered');
        return;
      }

      await emergencyService.submitResponse(
        currentEmergency.id,
        deviceId,
        false
      );
      Alert.alert('Bestätigt', 'Absage wurde gemeldet');
      setCurrentEmergency(null);
    } catch (error) {
      console.error('Error submitting decline:', error);
      Alert.alert('Error', 'Failed to submit response');
    }
  };

  const handleDismiss = () => {
    setCurrentEmergency(null);
  };

  const handleEmergencyPress = (emergency: Emergency) => {
    setCurrentEmergency(emergency);
  };

  if (loading) {
    return <View style={[styles.container, { backgroundColor: theme.colors.background }]} />;
  }

  if (currentEmergency) {
    return (
      <EmergencyAlertScreen
        emergency={currentEmergency}
        onParticipate={handleParticipate}
        onDecline={handleDecline}
        onDismiss={handleDismiss}
      />
    );
  }

  if (!isRegistered) {
    return (
      <RegistrationScreen onRegistrationComplete={handleRegistrationComplete} />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home">
          {(props) => <HomeScreen {...props} onEmergencyPress={handleEmergencyPress} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const App = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
